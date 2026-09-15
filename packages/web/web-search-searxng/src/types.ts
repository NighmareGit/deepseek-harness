/**
 * Wire types for a SearXNG instance's JSON API (`GET /search?q=<query>&format=json`).
 * Types only — no runtime code. SearXNG aggregates upstream engines and returns a flat
 * `results[]`; each entry carries a URL, optional title, optional snippet text in
 * `content`, and an optional `publishedDate`. The JSON format must be enabled in the
 * instance's `settings.yml` (`search.formats: [html, json]`); a 403 otherwise.
 *
 * @module @deepseek-ai/dsh-web-search-searxng/types
 */

/** One entry of SearXNG's flat `results[]`. */
export interface SearxngResult {
  /**
   * Result target URL. Well-formed responses always carry one, but the field
   * stays optional so a partial/hostile payload maps honestly instead of
   * trusting a shape it did not validate.
   */
  url?: string
  title?: string | null
  /** Upstream snippet/excerpt text for the result. */
  content?: string | null
  /** Publication/crawl timestamp as an ISO-8601 string, when the engine supplies one. */
  publishedDate?: string | null
}

/** SearXNG's search response envelope. */
export interface SearxngSearchResponse {
  /** The echoed query string. */
  query?: string
  /** Instant answers (calculator, special pages); deliberately NOT mapped to `content`. */
  answers?: unknown[]
  /** The aggregated result list. */
  results?: SearxngResult[]
  /** Engines that failed for this query, as `[name, error]` pairs; informational only. */
  unresponsive_engines?: unknown[]
}

/** SearXNG's error response envelope (best-effort; fields vary by failure). */
export interface SearxngError {
  error?: string
  message?: string
}
