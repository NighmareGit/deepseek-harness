/**
 * `SearxngSearchProvider`: a `WebSearchProvider` backed by a self-hosted SearXNG instance's
 * JSON API (`GET /search?q=<query>&format=json`). It maps the flat `results[]` into the
 * seam's normalized sources, drops entries without a URL, and omits `content` because
 * SearXNG returns no generated answer (its `answers[]` instant answers are deliberately
 * not mapped). No API key is involved: the provider is keyless by construction.
 * @module @deepseek-ai/dsh-web-search-searxng/provider
 */

import { WebError } from '@deepseek-ai/dsh-web'
import type {
  WebSearchProvider,
  WebSearchRequest,
  WebSearchResult,
  WebSearchSource,
} from '@deepseek-ai/dsh-web'
import type { SearxngError, SearxngResult, SearxngSearchResponse } from './types.ts'

/** Stable id this provider registers under. */
export const SEARXNG_PROVIDER_ID = 'searxng'

/**
 * Default endpoint: a local SearXNG publishing its container port on
 * `127.0.0.1:8888` (`-p 8888:8080`). Deployments point `baseURL` at their instance.
 */
export const SEARXNG_DEFAULT_BASE_URL = 'http://127.0.0.1:8888'

/** Attribution header sent on every request. Bump with the package version. */
const USER_AGENT = 'deepseek-harness/0.0.1'

/** Resolved provider options (the plugin's `apply` supplies env-var and constant defaults). */
export interface SearxngSearchProviderOptions {
  /** SearXNG instance base; `?q=<query>&format=json` is appended to `/search`. */
  baseURL: string
  /** Optional `language` parameter forwarded to the instance (e.g. `en`). */
  language?: string
}

/**
 * Map one SearXNG result to a normalized source, or `undefined` when it carries no URL
 * (an entry with no URL has no citeable target — the seam has no other field to derive
 * one from, and inventing one would lie).
 *
 * @param result - one entry of SearXNG's `results[]`.
 * @returns the normalized source, or `undefined` when the entry has no URL.
 */
export function mapSearxngResult(result: SearxngResult): WebSearchSource | undefined {
  if (result.url === undefined || result.url.trim().length === 0) return undefined
  return {
    url: result.url,
    ...result.title != null && result.title.length > 0 ? { title: result.title } : {},
    ...result.content != null && result.content.length > 0 ? { snippet: result.content } : {},
    ...result.publishedDate != null && result.publishedDate.length > 0
      ? { publishedAt: result.publishedDate }
      : {},
  }
}

/**
 * Map a SearXNG response envelope to a normalized search result.
 *
 * @param response - the parsed `GET /search` response body.
 * @returns the normalized result; URL-less entries are dropped
 *   ({@link mapSearxngResult}). SearXNG returns no generated answer, so `content`
 *   is omitted. The web service owns the final `maxResults` truncation, so this
 *   provider reports `truncated: false`.
 */
export function mapSearxngResponse(response: SearxngSearchResponse): WebSearchResult {
  const sources = (response.results ?? [])
    .map(mapSearxngResult)
    .filter((source): source is WebSearchSource => source !== undefined)
  return { sources, truncated: false }
}

/** The SearXNG-backed search provider; HTTP redirects fail as `WEB_PROVIDER_ERROR`. */
export class SearxngSearchProvider implements WebSearchProvider {
  readonly id = SEARXNG_PROVIDER_ID

  /**
   * The options thunk is read per search, so a settings-section commit (see the
   * plugin's `apply`) takes effect on the next query without re-registering.
   */
  constructor(private readonly options: () => SearxngSearchProviderOptions) {}

  available(): boolean {
    // Keyless by construction: usability is purely a matter of a parseable endpoint.
    return isValidBaseUrl(this.options().baseURL)
  }

  async search(request: WebSearchRequest, signal?: AbortSignal): Promise<WebSearchResult> {
    const { baseURL, language } = this.options()
    // Resolve `/search` against the configured path rather than resetting to the
    // root, so a baseURL carrying a subpath (e.g. behind a reverse proxy or a
    // fixture route) is preserved.
    const base = new URL(baseURL)
    const url = new URL(`${base.pathname.replace(/\/+$/, '')}/search`, base)
    url.searchParams.set('q', request.query)
    url.searchParams.set('format', 'json')
    if (language !== undefined) url.searchParams.set('language', language)

    let response: Response
    try {
      response = await fetch(url, {
        method: 'GET',
        redirect: 'error',
        headers: {
          'accept': 'application/json',
          'user-agent': USER_AGENT,
        },
        ...signal !== undefined ? { signal } : {},
      })
    } catch (error: unknown) {
      if (isAbortError(error)) throw new WebError('SearXNG search aborted', 'WEB_ABORTED', { cause: error })
      throw new WebError(`SearXNG search request failed: ${String(error)}`, 'WEB_PROVIDER_ERROR', { cause: error })
    }

    if (!response.ok) {
      const status = response.status
      let message = `SearXNG API error (HTTP ${status})`
      try {
        const parsed = await response.json() as SearxngError
        const detail = parsed.error ?? parsed.message
        if (detail !== undefined && detail.length > 0) message = detail
      } catch (error: unknown) {
        // An abort fired mid-body must surface as WEB_ABORTED, not be swallowed
        // into a generic HTTP-error message — cancellation is not a provider
        // error (the seam's cancellation contract).
        if (isAbortError(error)) throw new WebError('SearXNG search aborted', 'WEB_ABORTED', { cause: error })
        // Otherwise: the HTTP status is already captured in `message` above; a
        // malformed/non-JSON error body (e.g. SearXNG's HTML 403 when the JSON
        // format is disabled) can only cost a richer provider message.
      }
      throw new WebError(message, 'WEB_PROVIDER_ERROR')
    }

    try {
      const payload = await response.json() as SearxngSearchResponse
      return mapSearxngResponse(payload)
    } catch (error: unknown) {
      if (isAbortError(error)) throw new WebError('SearXNG search aborted', 'WEB_ABORTED', { cause: error })
      throw new WebError(`SearXNG returned an unprocessable response body: ${String(error)}`, 'WEB_PROVIDER_ERROR', { cause: error })
    }
  }
}

/** True when `baseURL` parses as an absolute URL (a cheap local config check). */
function isValidBaseUrl(baseURL: string): boolean {
  return URL.canParse(baseURL)
}

/** True for a fetch/`AbortSignal` abort, surfaced as `WEB_ABORTED`. */
function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}
