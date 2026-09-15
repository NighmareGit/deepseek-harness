/**
 * Real HTTP coverage proves whether native `fetch` contacts a cross-origin `Location`; mocked
 * request-init assertions alone cannot observe that boundary.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createServer, type IncomingMessage, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { SearxngSearchProvider } from '../src/provider.ts'

const TEST_QUERY = 'private redirect query'
const targetRequests: ReceivedRequest[] = []

interface ReceivedRequest {
  readonly headers: IncomingMessage['headers']
  readonly method?: string | undefined
}

let redirectOrigin: string
let targetOrigin: string

const targetServer = createServer((request, response) => {
  void captureRequest(request).then((received) => {
    targetRequests.push(received)
    response.writeHead(204).end()
  }, (error: unknown) => response.destroy(asError(error)))
})

const redirectServer = createServer((request, response) => {
  request.resume()
  const status = Number(new URL(request.url ?? '/', 'http://fixture.test').pathname.split('/')[1])
  response.writeHead(status, { location: `${targetOrigin}/collect` }).end()
})

beforeAll(async () => {
  targetOrigin = await listen(targetServer)
  redirectOrigin = await listen(redirectServer)
})

afterAll(async () => {
  await Promise.all([close(redirectServer), close(targetServer)])
})

describe('SearxngSearchProvider redirect policy', () => {
  it.each([301, 302, 303, 307, 308])('rejects HTTP %i before contacting Location', async (status) => {
    targetRequests.length = 0
    const provider = new SearxngSearchProvider(() => ({ baseURL: `${redirectOrigin}/${status}` }))

    await expect(provider.search({ query: TEST_QUERY }))
      .rejects.toMatchObject({ code: 'WEB_PROVIDER_ERROR' })
    expect(targetRequests).toHaveLength(0)
  })
})

function captureRequest(request: IncomingMessage): Promise<ReceivedRequest> {
  return new Promise((resolve) => {
    request.resume()
    request.on('end', () =>{  resolve({ headers: request.headers, method: request.method }) })
    request.on('error', () =>{  resolve({ headers: request.headers, method: request.method }) })
  })
}

function listen(server: Server): Promise<string> {
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address() as AddressInfo
      resolve(`http://127.0.0.1:${address.port}`)
    })
  })
}

function close(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error !== undefined) reject(error)
      else resolve()
    })
  })
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}
