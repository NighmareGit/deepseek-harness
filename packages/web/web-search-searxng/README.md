# @deepseek-ai/dsh-web-search-searxng

English | [中文](README.zh.md)

A [SearXNG](https://docs.searxng.org/)-backed `WebSearchProvider` for the harness [web capability seam](../web/README.md) (`ctx.web`). It calls a self-hosted SearXNG instance's `GET /search?q=<query>&format=json` endpoint and maps the flat `results[]` into the seam's normalized `WebSearchResult`.

This is an **implementation** package: it registers a provider into `ctx.web`, it does not own the `ctx.web` key and it does not register a model-facing tool (that is `@deepseek-ai/dsh-tool-web`). Like `@deepseek-ai/dsh-web-search-exa`, it is a function/namespace plugin (`inject: ['web']`) that registers its backend, not a default-export service.

The provider is **keyless by construction**: no API key, credential reference, or secret participates in any request — `baseURL` alone configures it. The instance must have the JSON format enabled in its `settings.yml` (`search.formats: [html, json]`); a 403 otherwise.

## Config

| Key | Default | Meaning |
|---|---|---|
| `baseURL` | `http://127.0.0.1:8888` | Instance base; `/search` is requested with `q`, `format=json`, and optional `language`. An unparseable value makes the provider unavailable. |
| `language` | (unset) | Optional `language` parameter forwarded to the instance (e.g. `en`). Unset sends no parameter. |

```yaml
- id: web-search-searxng
  name: '@deepseek-ai/dsh-web-search-searxng'
  config:
    baseURL: http://searxng.lan:8888
```

The endpoint resolves per search: the composition entry, then `$SEARXNG_BASE_URL`, then the default — and a committed `web-search-searxng:` settings section overrides all of them without a re-registration, exactly as `llm-deepseek:` does for its adapter.

## Mapping

SearXNG returns a flat `results[]` and no generated answer, so `content` is omitted (the `answers[]` instant-answer list is deliberately not mapped). Each result maps to a `WebSearchSource`: `url` ← `url`, `title` ← `title`, `snippet` ← `content`, `publishedAt` ← `publishedDate`. A result with no URL has no citeable target and is dropped. `maxResults` is not sent to the instance (its JSON API has no result-count control); the final bound is enforced by the seam. Provider failures (HTTP errors, network failure, unparseable or wrong-shape bodies) surface as `WebError` `WEB_PROVIDER_ERROR`; an aborted request surfaces as `WEB_ABORTED`. HTTP redirects are rejected before the `Location` target is contacted and surface as `WEB_PROVIDER_ERROR`.

## Model Experience

Indirectly, through [`dsh-tool-web`](../tool-web/README.md), which retains this provider's `maxResults`-bounded URLs, titles, snippets, and publication dates or its exact `SearXNG search aborted`, `SearXNG search request failed: <error>`, and `SearXNG returned an unprocessable response body: <error>` failures under the consumer's error wrapper while instant answers and provider-private fields remain outside context.

#### KV Cache effect

No direct invalidation; the named consumer owns any request-prefix changes.

## Known Limitations and Deferred Work

- **A result with no URL is dropped entirely** — no citeable target to map, so fewer sources than the requested count can return.
- **`maxResults` is enforced only at the seam** — SearXNG's JSON API exposes no result-count control, so an over-returning instance is truncated after the fetch rather than during it.
- **Only `baseURL`/`language` are exposed** — SearXNG's other controls (categories, engines, safesearch, time ranges) wait on provider-neutral Service Definition fields ([seam Agent Note](../../../.agents/notes/implemented/architecture/2026-06-24-web-capability-seam.md)).
- **Abort classification is error-shape-based** — only a `DOMException` named `AbortError` maps to `WEB_ABORTED`; an abort carrying a custom reason (e.g. `dsh-timeout`'s `TimeoutReason`) surfaces as `WEB_PROVIDER_ERROR`.
