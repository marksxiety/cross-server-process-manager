import { afterEach, beforeEach, describe, expect, test, vi, type Mock } from 'vitest'
import type { LoaderFunctionArgs } from 'react-router'

vi.mock('@/api/services/auth.service', () => ({
  authService: vi.fn(),
}))

import { authService } from '@/api/services/auth.service'
import {
  redirectIfAuthenticated,
  requireMember,
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
  role: 'viewer',
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

function args(url: string): LoaderFunctionArgs {
  return { request: new Request(url), params: {} } as unknown as LoaderFunctionArgs
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
  vi.stubGlobal('sessionStorage', storage)
  vi.mocked(authService).mockReset()
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

    const data = await requireSession(args('http://localhost/'))

    expect(data).toEqual({ mode: 'guest' })
    expect(useAuthStore.getState().status).toBe('guest')
    expect(service.me).not.toHaveBeenCalled()
  })

  test('redirects an unauthenticated visitor to /login with the target path', async () => {
    mockAuthService()

    const response = await asyncResponseFrom(() =>
      requireSession(args('http://localhost/server')),
    )

    expect(response.headers.get('Location')).toBe('/login?from=%2Fserver')
  })

  test('validates a stored token and hydrates the user', async () => {
    const service = mockAuthService()
    service.me.mockResolvedValue(success(USER))
    writeSession(PAYLOAD, storage)

    const data = await requireSession(args('http://localhost/'))

    expect(data).toEqual({ mode: 'user', stale: false })
    expect(useAuthStore.getState().status).toBe('authenticated')
    expect(useAuthStore.getState().user).toEqual(USER)
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

    const response = await asyncResponseFrom(() =>
      requireSession(args('http://localhost/')),
    )

    expect(response.headers.get('Location')).toBe('/login?from=%2F')
    expect(readSession(storage)).toBeNull()
    expect(useAuthStore.getState().status).toBe('unauthenticated')
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

    const data = await requireSession(args('http://localhost/'))

    expect(data).toEqual({ mode: 'user', stale: true })
    expect(useAuthStore.getState().user).toEqual(USER)
    expect(useAuthStore.getState().status).toBe('authenticated')
  })
})

describe('requireMember', () => {
  test('lets a signed-in user through', () => {
    writeSession(PAYLOAD, storage)

    expect(requireMember(args('http://localhost/server'))).toBeNull()
  })

  test('sends guests back to the dashboard', () => {
    startGuestSession(storage)

    const response = responseFrom(() => requireMember(args('http://localhost/server')))

    expect(response.headers.get('Location')).toBe('/')
    expect(isGuestSession(storage)).toBe(true)
  })

  test('redirects an unauthenticated visitor to /login', () => {
    const response = responseFrom(() => requireMember(args('http://localhost/template')))

    expect(response.headers.get('Location')).toBe('/login?from=%2Ftemplate')
  })
})

describe('redirectIfAuthenticated', () => {
  test('allows guests to see /login', () => {
    startGuestSession(storage)

    expect(redirectIfAuthenticated(args('http://localhost/login'))).toBeNull()
  })

  test('clears a stale auth error whenever the page is entered', () => {
    useAuthStore.setState({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
        status: 401,
      },
    })

    expect(redirectIfAuthenticated(args('http://localhost/login'))).toBeNull()
    expect(useAuthStore.getState().error).toBeNull()
  })

  test('sends a signed-in user to the dashboard', () => {
    writeSession(PAYLOAD, storage)

    const response = responseFrom(() =>
      redirectIfAuthenticated(args('http://localhost/login')),
    )

    expect(response.headers.get('Location')).toBe('/')
  })

  test('honors a safe from parameter', () => {
    writeSession(PAYLOAD, storage)

    const response = responseFrom(() =>
      redirectIfAuthenticated(args('http://localhost/login?from=%2Fserver')),
    )

    expect(response.headers.get('Location')).toBe('/server')
  })

  test('ignores an absolute from parameter', () => {
    writeSession(PAYLOAD, storage)

    const response = responseFrom(() =>
      redirectIfAuthenticated(
        args('http://localhost/login?from=https%3A%2F%2Fevil.example'),
      ),
    )

    expect(response.headers.get('Location')).toBe('/')
  })
})
