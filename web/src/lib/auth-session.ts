import { z } from 'zod'
import { authUserSchema } from '@/schemas/auth.schema'
import type { AuthSessionPayload, AuthUser } from '@/types/auth'

export const AUTH_SESSION_KEY = 'xpm.auth.session'
export const AUTH_GUEST_KEY = 'xpm.auth.guest'
const GUEST_VALUE = '1'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

const storedSessionSchema = z.object({
  token: z.string().min(1),
  expiresAt: z.number(),
  user: authUserSchema,
})

export type StoredSession = z.infer<typeof storedSessionSchema>

/** Auth state is shared across tabs, so both the token and guest flag use localStorage. */
function defaultStorage(): StorageLike | null {
  try {
    return globalThis.localStorage ?? null
  } catch (error) {
    console.warn('auth-session: localStorage is unavailable', error)
    return null
  }
}

export function readSession(
  storage: StorageLike | null = defaultStorage(),
  now = Date.now(),
): StoredSession | null {
  if (!storage) return null

  let raw: string | null
  try {
    raw = storage.getItem(AUTH_SESSION_KEY)
  } catch (error) {
    console.warn('auth-session: could not read the stored session', error)
    return null
  }
  if (!raw) return null

  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch (error) {
    console.warn('auth-session: discarding a corrupt stored session', error)
    removeSession(storage)
    return null
  }

  const parsed = storedSessionSchema.safeParse(value)
  if (!parsed.success || parsed.data.expiresAt <= now) {
    removeSession(storage)
    return null
  }

  return parsed.data
}

function removeSession(storage: StorageLike): void {
  try {
    storage.removeItem(AUTH_SESSION_KEY)
  } catch (error) {
    console.warn('auth-session: could not clear the session', error)
  }
}

export function writeSession(
  payload: AuthSessionPayload,
  storage: StorageLike | null = defaultStorage(),
  now = Date.now(),
): StoredSession {
  const session: StoredSession = {
    token: payload.token,
    expiresAt: now + payload.expires_in * 1000,
    user: payload.user,
  }

  try {
    storage?.setItem(AUTH_SESSION_KEY, JSON.stringify(session))
  } catch (error) {
    console.warn('auth-session: could not persist the session', error)
  }

  return session
}

export function updateSessionUser(
  user: AuthUser,
  storage: StorageLike | null = defaultStorage(),
): void {
  const session = readSession(storage)
  if (!session) return

  try {
    storage?.setItem(AUTH_SESSION_KEY, JSON.stringify({ ...session, user }))
  } catch (error) {
    console.warn('auth-session: could not refresh the stored user', error)
  }
}

export function clearSession(storage: StorageLike | null = defaultStorage()): void {
  if (storage) removeSession(storage)
}

export function getAccessToken(
  storage: StorageLike | null = defaultStorage(),
  now = Date.now(),
): string | null {
  return readSession(storage, now)?.token ?? null
}

export function isGuestSession(storage: StorageLike | null = defaultStorage()): boolean {
  if (!storage) return false

  try {
    return storage.getItem(AUTH_GUEST_KEY) === GUEST_VALUE
  } catch (error) {
    console.warn('auth-session: could not read the guest flag', error)
    return false
  }
}

export function startGuestSession(storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.setItem(AUTH_GUEST_KEY, GUEST_VALUE)
  } catch (error) {
    console.warn('auth-session: could not persist guest mode', error)
  }
}

export function clearGuestSession(storage: StorageLike | null = defaultStorage()): void {
  try {
    storage?.removeItem(AUTH_GUEST_KEY)
  } catch (error) {
    console.warn('auth-session: could not clear guest mode', error)
  }
}
