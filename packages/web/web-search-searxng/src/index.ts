/**
 * `@deepseek-ai/dsh-web-search-searxng`: registers a SearXNG-backed `WebSearchProvider`
 * with `ctx.web`. A function/namespace plugin (NOT a default-export service):
 * a search provider does not own the `ctx.web` key — it registers INTO the
 * seam's provider registry, exactly as `@deepseek-ai/dsh-web-search-exa`
 * registers an adapter into `ctx.web`. The key is owned by `@deepseek-ai/dsh-web`.
 *
 * The provider is keyless by construction: no credential, API key, or secret
 * participates in any request — `baseURL` alone configures it.
 *
 * @module @deepseek-ai/dsh-web-search-searxng
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import SettingsProvider, { type SettingsNamespace } from '@deepseek-ai/dsh-settings'
import { launchEnvironmentOf } from '@deepseek-ai/dsh-launch-environment'
import type {} from '@deepseek-ai/dsh-web'
import {
  SearxngSearchProvider,
  SEARXNG_DEFAULT_BASE_URL,
} from './provider.ts'
import type { SearxngSearchProviderOptions } from './provider.ts'

export {
  SEARXNG_DEFAULT_BASE_URL,
  SEARXNG_PROVIDER_ID,
  SearxngSearchProvider,
} from './provider.ts'
export type { SearxngSearchProviderOptions } from './provider.ts'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'web-search-searxng'

/** The web seam this provider registers into. */
export const inject = ['web']

/** Plugin config (all optional — `apply` fills env-var and constant defaults). */
export interface Config {
  /** SearXNG instance base; `/search?q=<query>&format=json` is requested. */
  baseURL?: string
  /** Optional `language` parameter forwarded to the instance (e.g. `en`). */
  language?: string
}

export const Config: z<Config> = z.object({
  // Declared here rather than only at the use site: a configuration surface
  // renders the resolved section, so a default the schema does not carry reads
  // there as no value at all.
  baseURL: z.string(),
  language: z.string(),
})

/**
 * Environment variable naming this provider's endpoint. A deployment override
 * for the same field the settings section carries; the settings section wins.
 */
const SEARXNG_BASE_URL_ENV = 'SEARXNG_BASE_URL'

/** Settings namespace carrying this provider's endpoint. */
export const WEB_SEARCH_SEARXNG_SETTINGS_NAMESPACE: SettingsNamespace = 'web-search-searxng' as SettingsNamespace

/**
 * Project one resolved section into the options the provider serves its next
 * search with. Environment fallbacks stay here rather than in the provider:
 * every value it reads is already fully defaulted.
 * @param ctx - plugin context supplying the environment plane.
 * @param config - the currently authoritative section.
 * @returns options for one search.
 */
function resolveOptions(ctx: Context, config: Config): SearxngSearchProviderOptions {
  return {
    baseURL: config.baseURL
      ?? launchEnvironmentOf(ctx).get(SEARXNG_BASE_URL_ENV)?.value
      ?? SEARXNG_DEFAULT_BASE_URL,
    ...config.language !== undefined ? { language: config.language } : {},
  }
}

/** Register the SearXNG search provider with `ctx.web`. */
export function apply(ctx: Context, config: Config): void {
  let current: () => Config = () => config
  const settings = ctx.get('settings') as SettingsProvider | undefined
  if (settings !== undefined) {
    settings.installSection(ctx, WEB_SEARCH_SEARXNG_SETTINGS_NAMESPACE, Config, config, {
      setSource: (source: () => Config) => {
        current = source
      },
      // The registration carries no resolved value: the provider projects the
      // section per search, so a committed change needs no re-registration.
      onChange: () => {},
    })
  }
  ctx.web.registerSearchProvider(new SearxngSearchProvider(() => resolveOptions(ctx, current())))
}
