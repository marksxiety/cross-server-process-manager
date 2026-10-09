import { afterEach, describe, expect, test, vi } from 'vitest'
import { createConnection } from '../../api/connection'

function stubFetch(): RequestInit[] {
  const calls: RequestInit[] = []
  vi.stubGlobal('fetch', async (_url: string, init?: RequestInit) => {
    calls.push(init ?? {})
    return new Response(JSON.stringify({ success: true, message: 'ok', info: null }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  })
  return calls
}

describe('createConnection', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('sends a Bearer token when authToken is provided', async () => {
    const calls = stubFetch()

    await createConnection({
      protocol: 'http',
      host: 'localhost',
      port: 4000,
      authToken: 'secret',
    }).get('/pm2/list')

    expect(new Headers(calls[0]?.headers).get('Authorization')).toBe('Bearer secret')
  })

  test('omits the Authorization header when authToken is not provided', async () => {
    const calls = stubFetch()

    await createConnection({ protocol: 'http', host: 'localhost', port: 4000 }).get('/pm2/list')

    expect(new Headers(calls[0]?.headers).get('Authorization')).toBeNull()
  })
})
