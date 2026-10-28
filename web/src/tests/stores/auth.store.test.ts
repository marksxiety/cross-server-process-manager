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
  clearGuestSession,
  clearSession,
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

function mockAuthService(): {
  login: Mock
  register: Mock
  me: Mock
  logout: Mock
} {
  const service = {
    login: vi.fn(),
    register: vi.fn(),
    me: vi.fn(),
    logout: vi.fn(),
  }
  vi.mocked(authService).mockReturnValue(
    service as unknown as ReturnType<typeof authService>,
  )
  return service
}

function success<T>(info: T): ApiResponse<T> {
  return { success: true, message: 'ok', info, status: 200 }
}

function failure<T>(message: string, status: number, code?: string): ApiResponse<T> {
  return {
    success: false,
    message,
    ...(code === undefined ? {} : { code }),
    info: null,
    status,
  }
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

describe('auth store login/register', () => {
  test('login stores the session and marks the user authenticated', async () => {
    const service = mockAuthService()
    service.login.mockResolvedValue(success(PAYLOAD))

    const signedIn = await useAuthStore
      .getState()
      .login({ email: 'admin@example.com', password: 'secret-password' })

    expect(signedIn).toBe(true)
    const state = useAuthStore.getState()
    expect(state.status).toBe('authenticated')
    expect(state.token).toBe('jwt-token')
    expect(state.user).toEqual(USER)
    expect(state.expiresAt).toBe(readSession(storage)?.expiresAt)
    expect(state.error).toBeNull()
    expect(readSession(storage)?.token).toBe('jwt-token')
  })

  test('login failure records the API error and keeps the visitor signed out', async () => {
    const service = mockAuthService()
    service.login.mockResolvedValue(
      failure('Invalid email or password', 401, 'INVALID_CREDENTIALS'),
    )

    const signedIn = await useAuthStore
      .getState()
      .login({ email: 'admin@example.com', password: 'wrong-password' })

    expect(signedIn).toBe(false)
    const state = useAuthStore.getState()
    expect(state.status).toBe('unauthenticated')
    expect(state.token).toBeNull()
    expect(state.expiresAt).toBeNull()
    expect(state.user).toBeNull()
    expect(readSession(storage)).toBeNull()
  })

  test('register clears guest mode but does not start a session', async () => {
    const service = mockAuthService()
    service.register.mockResolvedValue(success({ email: 'admin@example.com' }))
    startGuestSession(storage)
    useAuthStore.setState({ status: 'guest' })

    const created = await useAuthStore.getState().register({
      email: 'admin@example.com',
      name: 'Admin',
    })

    expect(created).toBe(true)
    expect(useAuthStore.getState().status).toBe('unauthenticated')
    expect(isGuestSession(storage)).toBe(false)
    expect(readSession(storage)).toBeNull()
  })
})

describe('auth store guest mode', () => {
  test('continueAsGuest clears any session and persists the guest flag', () => {
    writeSession(PAYLOAD, storage)

    useAuthStore.getState().continueAsGuest()

    const state = useAuthStore.getState()
    expect(state.status).toBe('guest')
    expect(state.token).toBeNull()
    expect(state.user).toBeNull()
    expect(state.expiresAt).toBeNull()
    expect(isGuestSession(storage)).toBe(true)
    expect(readSession(storage)).toBeNull()
  })
})

describe('auth store restore', () => {
  test('refreshes the cached user from /auth/me', async () => {
    const service = mockAuthService()
    const fresh = { ...USER, name: 'Fresh Name' }
    service.me.mockResolvedValue(success(fresh))
    writeSession(PAYLOAD, storage)
    useAuthStore.setState({
      token: PAYLOAD.token,
      user: { ...USER, name: 'Stale Name' },
      status: 'idle',
    })

    await useAuthStore.getState().restore()

    expect(useAuthStore.getState().status).toBe('authenticated')
    expect(useAuthStore.getState().user?.name).toBe('Fresh Name')
    expect(readSession(storage)?.user.name).toBe('Fresh Name')
  })

  test('clears the session when /auth/me rejects the token', async () => {
    const service = mockAuthService()
    service.me.mockResolvedValue(failure('Token is invalid', 401, 'INVALID_TOKEN'))
    writeSession(PAYLOAD, storage)
    useAuthStore.setState({ token: PAYLOAD.token, user: USER, status: 'idle' })

    await useAuthStore.getState().restore()

    const state = useAuthStore.getState()
    expect(state.status).toBe('unauthenticated')
    expect(state.token).toBeNull()
    expect(state.user).toBeNull()
    expect(readSession(storage)).toBeNull()
  })

  test('keeps the cached session when /auth/me is unreachable', async () => {
    const service = mockAuthService()
    service.me.mockResolvedValue(failure('Network error reaching localhost:5638', 0))
    writeSession(PAYLOAD, storage)
    useAuthStore.setState({ token: PAYLOAD.token, user: USER, status: 'idle' })

    await useAuthStore.getState().restore()

    const state = useAuthStore.getState()
    expect(state.status).toBe('authenticated')
    expect(state.token).toBe('jwt-token')
    expect(state.error?.code).toBe('UNREACHABLE')
  })

  test('honors the guest flag when there is no token', async () => {
    const service = mockAuthService()
    startGuestSession(storage)
    useAuthStore.setState({ token: null, user: null, status: 'idle' })

    await useAuthStore.getState().restore()

    expect(useAuthStore.getState().status).toBe('guest')
    expect(service.me).not.toHaveBeenCalled()
  })

  test('retries /auth/me after a successful refresh', async () => {
    const service = mockAuthService()
    const fresh = { ...USER, name: 'Fresh Name' }
    service.me
      .mockResolvedValueOnce(failure('Token has expired', 401, 'TOKEN_EXPIRED'))
      .mockResolvedValueOnce(success(fresh))
    vi.mocked(requestRefresh).mockResolvedValue({
      status: 'refreshed',
      session: {
        token: 'next-jwt-token',
        expiresAt: Date.now() + 60_000,
        refreshToken: 'next-refresh-token',
        refreshExpiresAt: Date.now() + 2_592_000_000,
        user: USER,
      },
    })
    writeSession(PAYLOAD, storage)
    useAuthStore.setState({ token: PAYLOAD.token, user: USER, status: 'idle' })

    await useAuthStore.getState().restore()

    expect(service.me).toHaveBeenCalledTimes(2)
    expect(useAuthStore.getState().status).toBe('authenticated')
    expect(useAuthStore.getState().user?.name).toBe('Fresh Name')
    expect(useAuthStore.getState().token).toBe('next-jwt-token')
  })
})

describe('auth store refresh', () => {
  test('promotes the rotated session to state', async () => {
    const refreshed = {
      token: 'next-jwt-token',
      expiresAt: Date.now() + 3_600_000,
      refreshToken: 'next-refresh-token',
      refreshExpiresAt: Date.now() + 2_592_000_000,
      user: USER,
    }
    vi.mocked(requestRefresh).mockResolvedValue({ status: 'refreshed', session: refreshed })
    writeSession(PAYLOAD, storage)

    const ok = await useAuthStore.getState().refreshSession()

    expect(ok).toBe(true)
    expect(useAuthStore.getState()).toMatchObject({
      status: 'authenticated',
      token: 'next-jwt-token',
      expiresAt: refreshed.expiresAt,
      user: USER,
    })
  })

  test('marks the session expired when the refresh token is rejected', async () => {
    vi.mocked(requestRefresh).mockResolvedValue({ status: 'expired' })
    writeSession(PAYLOAD, storage)
    useAuthStore.setState({ status: 'authenticated', token: PAYLOAD.token, user: USER })

    const ok = await useAuthStore.getState().refreshSession()

    expect(ok).toBe(false)
    expect(useAuthStore.getState().status).toBe('expired')
    expect(readSession(storage)).toBeNull()
  })

  test('clears the session when there is nothing to refresh', async () => {
    vi.mocked(requestRefresh).mockResolvedValue({ status: 'missing' })
    writeSession(PAYLOAD, storage)
    useAuthStore.setState({ status: 'authenticated', token: PAYLOAD.token, user: USER })

    const ok = await useAuthStore.getState().refreshSession()

    expect(ok).toBe(false)
    expect(useAuthStore.getState().status).toBe('unauthenticated')
    expect(readSession(storage)).toBeNull()
  })

  test('keeps the session when the registry is unreachable', async () => {
    vi.mocked(requestRefresh).mockResolvedValue({ status: 'unreachable' })
    writeSession(PAYLOAD, storage)
    useAuthStore.setState({ status: 'authenticated', token: PAYLOAD.token, user: USER })

    const ok = await useAuthStore.getState().refreshSession()

    expect(ok).toBe(false)
    expect(useAuthStore.getState().status).toBe('authenticated')
    expect(readSession(storage)?.token).toBe('jwt-token')
  })
})

describe('auth store logout', () => {
  test('clears both the session and guest mode', () => {
    writeSession(PAYLOAD, storage)
    startGuestSession(storage)
    useAuthStore.setState({ status: 'authenticated', token: PAYLOAD.token, user: USER })

    useAuthStore.getState().logout()

    const state = useAuthStore.getState()
    expect(state.status).toBe('unauthenticated')
    expect(state.token).toBeNull()
    expect(state.expiresAt).toBeNull()
    expect(state.user).toBeNull()
    expect(readSession(storage)).toBeNull()
    expect(isGuestSession(storage)).toBe(false)
  })

  test('signOut revokes the server session and clears local state', async () => {
    const service = mockAuthService()
    service.logout.mockResolvedValue(success(null))
    writeSession(PAYLOAD, storage)
    useAuthStore.setState({ status: 'authenticated', token: PAYLOAD.token, user: USER })

    await useAuthStore.getState().signOut()

    expect(service.logout).toHaveBeenCalledTimes(1)
    expect(useAuthStore.getState().status).toBe('unauthenticated')
    expect(readSession(storage)).toBeNull()
  })

  test('signOut still clears local state when the request fails', async () => {
    const service = mockAuthService()
    service.logout.mockRejectedValue(new Error('offline'))
    writeSession(PAYLOAD, storage)
    useAuthStore.setState({ status: 'authenticated', token: PAYLOAD.token, user: USER })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await useAuthStore.getState().signOut()

    expect(useAuthStore.getState().status).toBe('unauthenticated')
    expect(readSession(storage)).toBeNull()
  })
})

describe('auth store expiry', () => {
  test('expireSession clears the token but keeps the account for the dialog', () => {
    writeSession(PAYLOAD, storage)
    useAuthStore.setState({
      status: 'authenticated',
      token: PAYLOAD.token,
      expiresAt: Date.now() + 60_000,
      user: USER,
    })

    useAuthStore.getState().expireSession()

    const state = useAuthStore.getState()
    expect(state.status).toBe('expired')
    expect(state.token).toBeNull()
    expect(state.expiresAt).toBeNull()
    expect(state.user).toEqual(USER)
    expect(readSession(storage)).toBeNull()
  })
})

describe('auth store cross-tab sync', () => {
  test('hydrates a session written by another tab', () => {
    writeSession(PAYLOAD, storage)
    useAuthStore.setState({
      status: 'unauthenticated',
      token: null,
      user: null,
      expiresAt: null,
    })

    useAuthStore.getState().syncFromStorage()

    const state = useAuthStore.getState()
    expect(state.status).toBe('authenticated')
    expect(state.token).toBe('jwt-token')
    expect(state.user).toEqual(USER)
    expect(state.expiresAt).toBe(readSession(storage)?.expiresAt)
  })

  test('switches to guest when only the guest flag exists', () => {
    startGuestSession(storage)
    useAuthStore.setState({
      status: 'authenticated',
      token: PAYLOAD.token,
      user: USER,
      expiresAt: Date.now() + 60_000,
    })

    useAuthStore.getState().syncFromStorage()

    const state = useAuthStore.getState()
    expect(state.status).toBe('guest')
    expect(state.token).toBeNull()
    expect(state.user).toBeNull()
    expect(state.expiresAt).toBeNull()
  })

  test('marks a cross-tab logout as signed out before expiry', () => {
    useAuthStore.setState({
      status: 'authenticated',
      token: 'stale-token',
      user: USER,
      expiresAt: Date.now() + 60_000,
    })
    clearSession(storage)
    clearGuestSession(storage)

    useAuthStore.getState().syncFromStorage()

    const state = useAuthStore.getState()
    expect(state.status).toBe('signed-out')
    expect(state.token).toBeNull()
  })

  test('marks a cross-tab expiry as expired', () => {
    useAuthStore.setState({
      status: 'authenticated',
      token: 'stale-token',
      user: USER,
      expiresAt: Date.now() - 1_000,
    })
    clearSession(storage)
    clearGuestSession(storage)

    useAuthStore.getState().syncFromStorage()

    const state = useAuthStore.getState()
    expect(state.status).toBe('expired')
    expect(state.user).toEqual(USER)
  })

  test('keeps the signed-out dialog open while storage stays empty', () => {
    useAuthStore.setState({
      status: 'signed-out',
      token: null,
      user: USER,
      expiresAt: null,
    })

    useAuthStore.getState().syncFromStorage()

    expect(useAuthStore.getState().status).toBe('signed-out')
  })
})
