import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { refreshSession } from '@/lib/auth-refresh'
import { readSession, writeSession } from '@/lib/auth-session'
import type { AuthSessionPayload, AuthUser } from '@/types/auth'
import { FakeStorage } from '../support/fake-storage'

const USER: AuthUser = {
  id: 1,
  email: 'admin@example.com',
  name: 'Admin',
  is_admin: false,
  pages: ['dashboard', 'server_metrics'],
  events: [],
  is_active: true,
  email_verified_at: null,
  last_login_at: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

const PAYLOAD: AuthSessionPayload = {
  token: 'jwt-token',
  token_type: 'Bearer',
  expires_in: 60,
  refresh_token: 'refresh-token',
  refresh_expires_in: 2_592_000,
  user: USER,
}

const NEXT_PAYLOAD: AuthSessionPayload = {
  ...PAYLOAD,
  token: 'next-jwt-token',
  refresh_token: 'next-refresh-token',
}

let storage: FakeStorage

function respondWith(payload: unknown, status = 200): void {
  vi.stubGlobal('fetch', async () =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  )
}

beforeEach(() => {
  storage = new FakeStorage()
  vi.stubGlobal('localStorage', storage)
  writeSession(PAYLOAD, storage)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('refreshSession', () => {
  test('rotates the token and persists the new session', async () => {
    const calls: RequestInit[] = []
    vi.stubGlobal('fetch', async (_url: string, init?: RequestInit) => {
      calls.push(init ?? {})
      return new Response(
        JSON.stringify({ success: true, message: 'Session refreshed', info: NEXT_PAYLOAD }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    })

    const result = await refreshSession()

    expect(result.status).toBe('refreshed')
    expect(readSession(storage)?.token).toBe('next-jwt-token')
    expect(readSession(storage)?.refreshToken).toBe('next-refresh-token')
    expect(JSON.parse(String(calls[0]?.body))).toEqual({ refresh_token: 'refresh-token' })
  })

  test('reports a missing session without calling the registry', async () => {
    storage.removeItem('xpm.auth.session')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const result = await refreshSession()

    expect(result.status).toBe('missing')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('reports an expired session on 401', async () => {
    respondWith(
      { success: false, message: 'Session has expired', code: 'REFRESH_TOKEN_EXPIRED', info: null },
      401
    )

    const result = await refreshSession()

    expect(result.status).toBe('expired')
    expect(readSession(storage)?.token).toBe('jwt-token')
  })

  test('reports a rejected session on 403', async () => {
    respondWith(
      { success: false, message: 'This account is disabled', code: 'ACCOUNT_DISABLED', info: null },
      403
    )

    const result = await refreshSession()

    expect(result).toMatchObject({ status: 'rejected', statusCode: 403, code: 'ACCOUNT_DISABLED' })
  })

  test('treats a network failure as unreachable and keeps the session', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new Error('offline')
    })
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const result = await refreshSession()

    expect(result.status).toBe('unreachable')
    expect(readSession(storage)?.token).toBe('jwt-token')
  })

  test('shares one in-flight request between concurrent callers', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({ success: true, message: 'Session refreshed', info: NEXT_PAYLOAD }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )
    vi.stubGlobal('fetch', fetchMock)

    const [first, second] = await Promise.all([refreshSession(), refreshSession()])

    expect(first.status).toBe('refreshed')
    expect(second.status).toBe('refreshed')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  test('reuses a token another tab already rotated', async () => {
    writeSession({ ...NEXT_PAYLOAD }, storage)
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const result = await refreshSession('jwt-token')

    expect(result.status).toBe('refreshed')
    expect(result.status === 'refreshed' && result.session.token).toBe('next-jwt-token')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
