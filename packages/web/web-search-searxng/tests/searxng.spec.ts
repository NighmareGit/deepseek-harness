import { afterEach, describe, expect, it, vi } from 'vitest'
import { SearxngSearchProvider, SEARXNG_PROVIDER_ID, mapSearxngResponse, mapSearxngResult } from '../src/provider.ts'

const options = { baseURL: 'http://searxng.test:8888' }

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' }, ...init })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('SearXNG result mapping', () => {
  it('maps a full result entry', () => {
    expect(mapSearxngResult({
      url: 'https://a.test',
      title: 'A',
      content: 'salient snippet',
      publishedDate: '2026-01-01',
    })).toEqual({ url: 'https://a.test', title: 'A', snippet: 'salient snippet', publishedAt: '2026-01-01' })
  })

  it('drops a result with no usable URL', () => {
    expect(mapSearxngResult({ url: '' })).toBeUndefined()
    expect(mapSearxngResult({ url: '   ' })).toBeUndefined()
    expect(mapSearxngResult({})).toBeUndefined()
  })

  it('omits null/empty optional fields rather than emitting them', () => {
    expect(mapSearxngResult({ url: 'https://a.test', title: null, content: null, publishedDate: null }))
      .toEqual({ url: 'https://a.test' })
    expect(mapSearxngResult({ url: 'https://a.test', title: '', content: '' }))
      .toEqual({ url: 'https://a.test' })
  })

  it('maps a response to a result with no content and filtered sources', () => {
    const result = mapSearxngResponse({
      results: [
        { url: 'https://a.test', content: 'one' },
        { content: 'no url' },
        { url: 'https://c.test', title: 'C', content: 'three' },
      ],
    })
    expect(result).toEqual({
      sources: [
        { url: 'https://a.test', snippet: 'one' },
        { url: 'https://c.test', title: 'C', snippet: 'three' },
      ],
      truncated: false,
    })
    expect(result.content).toBeUndefined()
  })

  it('tolerates a missing results array', () => {
    expect(mapSearxngResponse({}).sources).toEqual([])
  })
})

describe('SearxngSearchProvider availability', () => {
  it('is available with a parseable base URL — keyless by construction', () => {
    expect(new SearxngSearchProvider(() => options).available()).toBe(true)
  })

  it('is misconfigured when the base URL is unparseable', () => {
    expect(new SearxngSearchProvider(() => ({ baseURL: 'not a url' })).available()).toBe(false)
  })

  it('exposes the stable provider id', () => {
    expect(new SearxngSearchProvider(() => options).id).toBe(SEARXNG_PROVIDER_ID)
  })
})

describe('SearxngSearchProvider request mapping', () => {
  it('sends the query and json format as GET query parameters', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ results: [{ url: 'https://a.test', content: 'hi' }] }))
    vi.stubGlobal('fetch', fetchMock)

    await new SearxngSearchProvider(() => options).search({ query: 'hello world', maxResults: 5 })

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit]
    expect(String(url)).toBe('http://searxng.test:8888/search?q=hello+world&format=json')
    expect(init).toMatchObject({ method: 'GET', redirect: 'error' })
    expect((init.headers as Record<string, string>)['accept']).toBe('application/json')
  })

  it('preserves a configured subpath when resolving /search', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ results: [] }))
    vi.stubGlobal('fetch', fetchMock)
    await new SearxngSearchProvider(() => ({ baseURL: 'http://proxy.test/searx' })).search({ query: 'q' })
    const [subpathUrl] = fetchMock.mock.calls[0] as unknown as [URL]
    expect(String(subpathUrl)).toBe('http://proxy.test/searx/search?q=q&format=json')
  })

  it('forwards the configured language parameter', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ results: [] }))
    vi.stubGlobal('fetch', fetchMock)
    await new SearxngSearchProvider(() => ({ ...options, language: 'en' })).search({ query: 'q' })
    const [url] = fetchMock.mock.calls[0] as unknown as [URL]
    expect(url.searchParams.get('language')).toBe('en')
  })

  it('reads the options thunk per search, so a committed section wins on the next query', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ results: [] }))
    vi.stubGlobal('fetch', fetchMock)
    let baseURL = 'http://first.test'
    const provider = new SearxngSearchProvider(() => ({ baseURL }))
    await provider.search({ query: 'q' })
    baseURL = 'http://second.test'
    await provider.search({ query: 'q' })
    const calls = fetchMock.mock.calls as unknown as [URL][]
    expect(String(calls[0]?.[0])).toContain('http://first.test/')
    expect(String(calls[1]?.[0])).toContain('http://second.test/')
  })

  it('forwards the abort signal', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ results: [] }))
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()
    await new SearxngSearchProvider(() => options).search({ query: 'q' }, controller.signal)
    const [, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit]
    expect(init.signal).toBe(controller.signal)
  })
})

describe('SearxngSearchProvider error handling', () => {
  it('maps an HTTP error to WEB_PROVIDER_ERROR with the provider message', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'rate limited' }, { status: 429 })))
    await expect(new SearxngSearchProvider(() => options).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_ERROR', message: 'rate limited' }))
  })

  it('keeps a status-line message when the error body is not JSON (e.g. an HTML 403)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>Forbidden</html>', { status: 403 })))
    await expect(new SearxngSearchProvider(() => options).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_ERROR', message: 'SearXNG API error (HTTP 403)' }))
  })

  it('maps a network failure to WEB_PROVIDER_ERROR', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('connection refused'))))
    await expect(new SearxngSearchProvider(() => options).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_ERROR' }))
  })

  it('maps an abort to WEB_ABORTED', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new DOMException('aborted', 'AbortError'))))
    await expect(new SearxngSearchProvider(() => options).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_ABORTED' }))
  })

  it('maps a wrong-shape body to WEB_PROVIDER_ERROR', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>not json</html>', {
      status: 200,
      headers: { 'content-type': 'text/html' },
    })))
    await expect(new SearxngSearchProvider(() => options).search({ query: 'q' }))
      .rejects.toThrow(expect.objectContaining({ code: 'WEB_PROVIDER_ERROR' }))
  })
})
