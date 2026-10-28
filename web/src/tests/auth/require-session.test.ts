import { afterEach, beforeEach, describe, expect, test, vi, type Mock } from 'vitest'

vi.mock('@/api/services/auth.service', () => ({
  authService: vi.fn(),
}))

vi.mock('@/lib/auth-refresh', () => ({
  refreshSession: vi.fn(),
}))

import { authService } from '@/api/services/auth.service'
import { refreshSession as requestRefresh } from '@/lib/auth-refresh'
import {
  redirectIfAuthenticated,
  requireAdmin,
  requirePage,
  requireSession,
} from '@/auth/require-session'
import {
  isGuestSession,
  readSession,
  startGuestSession,
  writeSession,
} from '@/lib/auth-session'
import { createInitialAuthState, useAuthStore } from '@/stores/auth.store'
import type { ApiResponse } from '@/types/api'
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

let storage: FakeStorage

function mockAuthService(): { me: Mock } {
  const service = {
    login: vi.fn(),
    register: vi.fn(),
    me: vi.fn(),
  }
  vi.mocked(authService).mockReturnValue(
    service as unknown as ReturnType<typeof authService>,
  )
  return service
}

function responseFrom(run: () => unknown): Response {
  try {
    run()
  } catch (error) {
    if (error instanceof Response) return error
    throw error
  }
  throw new Error('Expected a redirect')
}

async function asyncResponseFrom(run: () => Promise<unknown>): Promise<Response> {
  try {
    await run()
  } catch (error) {
    if (error instanceof Response) return error
    throw error
  }
  throw new Error('Expected a redirect')
}

function success<T>(info: T): ApiResponse<T> {
  return { success: true, message: 'ok', info, status: 200 }
}

beforeEach(() => {
  storage = new FakeStorage()
  vi.stubGlobal('localStorage', storage)
  vi.mocked(authService).mockReset()
  vi.mocked(requestRefresh).mockReset()
  vi.mocked(requestRefresh).mockResolvedValue({ status: 'missing' })
  useAuthStore.setState(createInitialAuthState())
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('requireSession', () => {
  test('lets a guest into the dashboard without calling /auth/me', async () => {
    const service = mockAuthService()
    startGuestSession(storage)

    const data = await requireSession()

    expect(data).toEqual({ mode: 'guest' })
    expect(useAuthStore.getState().status).toBe('guest')
    expect(service.me).not.toHaveBeenCalled()
  })

  test('redirects an unauthenticated visitor to /login', async () => {
    mockAuthService()

    const response = await asyncResponseFrom(() => requireSession())

    expect(response.headers.get('Location')).toBe('/login')
  })

  test('validates a stored token and hydrates the user', async () => {
    const service = mockAuthService()
    service.me.mockResolvedValue(success(USER))
    writeSession(PAYLOAD, storage)

    const data = await requireSession()

    expect(data).toEqual({ mode: 'user', stale: false })
    expect(useAuthStore.getState().status).toBe('authenticated')
    expect(useAuthStore.getState().user).toEqual(USER)
    expect(useAuthStore.getState().expiresAt).toBe(readSession(storage)?.expiresAt)
  })

  test('clears a rejected token and redirects to /login', async () => {
    const service = mockAuthService()
    service.me.mockResolvedValue({
      success: false,
      message: 'Token is invalid',
      code: 'INVALID_TOKEN',
      info: null,
      status: 401,
    })
    writeSession(PAYLOAD, storage)

    const response = await asyncResponseFrom(() => requireSession())

    expect(response.headers.get('Location')).toBe('/login')
    expect(readSession(storage)).toBeNull()
    expect(useAuthStore.getState().status).toBe('unauthenticated')
  })

  test('refreshes and retries when /auth/me rejects the access token', async () => {
    const service = mockAuthService()
    service.me
      .mockResolvedValueOnce({
        success: false,
        message: 'Token is invalid',
        code: 'INVALID_TOKEN',
        info: null,
        status: 401,
      })
      .mockResolvedValueOnce(success(USER))
    vi.mocked(requestRefresh).mockImplementation(async () => {
      const session = writeSession(
        { ...PAYLOAD, token: 'next-jwt-token', refresh_token: 'next-refresh-token' },
        storage
      )
      return { status: 'refreshed', session }
    })
    writeSession(PAYLOAD, storage)

    const data = await requireSession()

    expect(data).toEqual({ mode: 'user', stale: false })
    expect(service.me).toHaveBeenCalledTimes(2)
    expect(useAuthStore.getState().token).toBe('next-jwt-token')
    expect(readSession(storage)?.token).toBe('next-jwt-token')
  })

  test('keeps the cached session when the refresh fails transiently', async () => {
    const service = mockAuthService()
    service.me.mockResolvedValue({
      success: false,
      message: 'Unauthorized',
      info: null,
      status: 401,
    })
    vi.mocked(requestRefresh).mockResolvedValue({ status: 'unreachable' })
    writeSession(PAYLOAD, storage)

    const data = await requireSession()

    expect(data).toEqual({ mode: 'user', stale: true })
    expect(useAuthStore.getState().status).toBe('authenticated')
    expect(readSession(storage)).not.toBeNull()
  })

  test('falls back to the cached user when /auth/me is unreachable', async () => {
    const service = mockAuthService()
    service.me.mockResolvedValue({
      success: false,
      message: 'Network error',
      info: null,
      status: 0,
    })
    writeSession(PAYLOAD, storage)

    const data = await requireSession()

    expect(data).toEqual({ mode: 'user', stale: true })
    expect(useAuthStore.getState().user).toEqual(USER)
    expect(useAuthStore.getState().status).toBe('authenticated')
  })
})

describe('requirePage', () => {
  test('lets a signed-in user with the page grant through', () => {
    writeSession(
      { ...PAYLOAD, user: { ...USER, pages: [...USER.pages, 'servers'] } },
      storage
    )

    expect(requirePage('servers')()).toBeNull()
  })

  test('lets an admin through without grants', () => {
    writeSession({ ...PAYLOAD, user: { ...USER, is_admin: true } }, storage)

    expect(requirePage('servers')()).toBeNull()
  })

  test('redirects an authenticated user without the grant', () => {
    writeSession(PAYLOAD, storage)

    const response = responseFrom(() => requirePage('servers')())

    expect(response.headers.get('Location')).toBe('/forbidden')
  })

  test('allows dashboard and metrics for guests', () => {
    startGuestSession(storage)

    expect(requirePage('dashboard')()).toBeNull()
    expect(requirePage('server_metrics')()).toBeNull()
  })

  test('sends guests back to the dashboard for member pages', () => {
    startGuestSession(storage)

    const response = responseFrom(() => requirePage('servers')())

    expect(response.headers.get('Location')).toBe('/')
    expect(isGuestSession(storage)).toBe(true)
  })

  test('redirects an unauthenticated visitor to /login', () => {
    const response = responseFrom(() => requirePage('servers')())

    expect(response.headers.get('Location')).toBe('/login')
  })
})

describe('requireAdmin', () => {
  test('lets an admin through', () => {
    writeSession({ ...PAYLOAD, user: { ...USER, is_admin: true } }, storage)

    expect(requireAdmin()).toBeNull()
  })

  test('redirects an authenticated non-admin', () => {
    writeSession(PAYLOAD, storage)

    const response = responseFrom(() => requireAdmin())

    expect(response.headers.get('Location')).toBe('/forbidden')
  })

  test('redirects a guest to login', () => {
    startGuestSession(storage)

    const response = responseFrom(() => requireAdmin())

    expect(response.headers.get('Location')).toBe('/login')
  })
})

describe('redirectIfAuthenticated', () => {
  test('allows guests to see /login', () => {
    startGuestSession(storage)

    expect(redirectIfAuthenticated()).toBeNull()
  })

  test('allows a first-time visitor with no session and no guest flag', () => {
    expect(redirectIfAuthenticated()).toBeNull()
  })

  test('clears a stale auth error whenever the page is entered', () => {
    useAuthStore.setState({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
        status: 401,
      },
    })

    expect(redirectIfAuthenticated()).toBeNull()
    expect(useAuthStore.getState().error).toBeNull()
  })

  test('sends a signed-in user to the dashboard', () => {
    writeSession(PAYLOAD, storage)

    const response = responseFrom(() => redirectIfAuthenticated())

    expect(response.headers.get('Location')).toBe('/')
  })
})
