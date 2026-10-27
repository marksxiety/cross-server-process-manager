import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  AUTH_GUEST_KEY,
  AUTH_SESSION_KEY,
  clearGuestSession,
  clearSession,
  getAccessToken,
  isGuestSession,
  readSession,
  startGuestSession,
  updateSessionUser,
  writeSession,
} from '@/lib/auth-session'
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
  user: USER,
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('session storage', () => {
  test('writes and reads a session with an absolute expiry', () => {
    const storage = new FakeStorage()

    const written = writeSession(PAYLOAD, storage, 1_000)

    expect(written.expiresAt).toBe(61_000)
    expect(readSession(storage, 2_000)).toEqual(written)
    expect(getAccessToken(storage, 2_000)).toBe('jwt-token')
  })

  test('treats an expired session as absent and removes it', () => {
    const storage = new FakeStorage()
    writeSession(PAYLOAD, storage, 1_000)

    expect(readSession(storage, 61_000)).toBeNull()
    expect(storage.size).toBe(0)
  })

  test('discards a corrupt stored session', () => {
    const storage = new FakeStorage()
    storage.setItem('xpm.auth.session', '{not-json')
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    expect(readSession(storage)).toBeNull()
    expect(storage.size).toBe(0)
  })

  test('discards a structurally invalid session', () => {
    const storage = new FakeStorage()
    storage.setItem('xpm.auth.session', JSON.stringify({ token: '', expiresAt: 1 }))

    expect(readSession(storage)).toBeNull()
    expect(storage.size).toBe(0)
  })

  test('refreshes the stored user without changing the token or expiry', () => {
    const storage = new FakeStorage()
    const start = Date.now()
    writeSession(PAYLOAD, storage, start)
    const refreshed = { ...USER, name: 'Fresh Name' }

    updateSessionUser(refreshed, storage)

    const session = readSession(storage, start + 1_000)
    expect(session?.user.name).toBe('Fresh Name')
    expect(session?.token).toBe('jwt-token')
    expect(session?.expiresAt).toBe(start + 60_000)
  })

  test('clears the token but leaves guest mode untouched', () => {
    const storage = new FakeStorage()
    writeSession(PAYLOAD, storage, 1_000)
    startGuestSession(storage)

    clearSession(storage)

    expect(readSession(storage)).toBeNull()
    expect(isGuestSession(storage)).toBe(true)
  })

  test('reads and clears the guest flag', () => {
    const storage = new FakeStorage()

    expect(isGuestSession(storage)).toBe(false)
    startGuestSession(storage)
    expect(isGuestSession(storage)).toBe(true)

    clearGuestSession(storage)
    expect(isGuestSession(storage)).toBe(false)
  })

  test('returns empty values when storage is unavailable', () => {
    expect(readSession(null)).toBeNull()
    expect(getAccessToken(null)).toBeNull()
    expect(isGuestSession(null)).toBe(false)
    expect(writeSession(PAYLOAD, null).token).toBe('jwt-token')
  })

  test('never throws when storage itself throws', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const broken = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('denied')
      },
      removeItem: () => {
        throw new Error('denied')
      },
    }

    expect(readSession(broken)).toBeNull()
    expect(isGuestSession(broken)).toBe(false)
    expect(() => clearSession(broken)).not.toThrow()
    expect(() => clearGuestSession(broken)).not.toThrow()
  })

  test('stores both the session and guest flag in localStorage', () => {
    const local = new FakeStorage()
    const session = new FakeStorage()
    vi.stubGlobal('localStorage', local)
    vi.stubGlobal('sessionStorage', session)

    writeSession(PAYLOAD)
    startGuestSession()

    expect(local.getItem(AUTH_SESSION_KEY)).not.toBeNull()
    expect(local.getItem(AUTH_GUEST_KEY)).toBe('1')
    expect(session.size).toBe(0)
    expect(readSession()?.token).toBe('jwt-token')
    expect(isGuestSession()).toBe(true)

    clearSession()
    expect(readSession()).toBeNull()
    expect(isGuestSession()).toBe(true)

    clearGuestSession()
    expect(isGuestSession()).toBe(false)
  })
})
