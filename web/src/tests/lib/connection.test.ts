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

  test('calls onUnauthorized when the server responds 401', async () => {
    vi.stubGlobal('fetch', async () =>
      new Response(JSON.stringify({ success: false, message: 'Unauthorized', info: null }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    const onUnauthorized = vi.fn()

    await createConnection({
      protocol: 'http',
      host: 'localhost',
      port: 4000,
      authToken: 'expired',
      onUnauthorized,
    }).get('/auth/me')

    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  test('does not call onUnauthorized for successful responses', async () => {
    stubFetch()
    const onUnauthorized = vi.fn()

    await createConnection({
      protocol: 'http',
      host: 'localhost',
      port: 4000,
      authToken: 'valid',
      onUnauthorized,
    }).get('/auth/me')

    expect(onUnauthorized).not.toHaveBeenCalled()
  })
})
