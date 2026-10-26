import { create } from 'zustand'
import { authService } from '@/api/services/auth.service'
import {
  clearGuestSession,
  clearSession,
  isGuestSession,
  readSession,
  startGuestSession,
  updateSessionUser,
  writeSession,
} from '@/lib/auth-session'
import { toApiError } from '@/lib/error-code'
import type { ApiError } from '@/types/api'
import type { AuthUser, LoginInput, RegisterInput } from '@/types/auth'

export type AuthStatus =
  | 'idle'
  | 'checking'
  | 'authenticated'
  | 'guest'
  | 'unauthenticated'

interface AuthSnapshot {
  user: AuthUser | null
  token: string | null
  status: AuthStatus
  error: ApiError | null
  isSubmitting: boolean
}

interface AuthState extends AuthSnapshot {
  login: (input: LoginInput) => Promise<boolean>
  register: (input: RegisterInput) => Promise<boolean>
  continueAsGuest: () => void
  restore: () => Promise<void>
  logout: () => void
  clearError: () => void
  hydrate: (token: string, user: AuthUser) => void
  hydrateGuest: () => void
}

/** Rebuilt by tests after they stub sessionStorage. */
export function createInitialAuthState(): AuthSnapshot {
  const session = readSession()
  if (session) {
    return {
      user: session.user,
      token: session.token,
      status: 'idle',
      error: null,
      isSubmitting: false,
    }
  }

  if (isGuestSession()) {
    return {
      user: null,
      token: null,
      status: 'guest',
      error: null,
      isSubmitting: false,
    }
  }

  return {
    user: null,
    token: null,
    status: 'unauthenticated',
    error: null,
    isSubmitting: false,
  }
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  ...createInitialAuthState(),

  login: async (input) => {
    set({ isSubmitting: true, error: null })
    const result = await authService().login(input)

    if (!result.success || !result.info) {
      set({ isSubmitting: false, error: toApiError(result) })
      return false
    }

    clearGuestSession()
    const session = writeSession(result.info)
    set({
      user: session.user,
      token: session.token,
      status: 'authenticated',
      error: null,
      isSubmitting: false,
    })
    return true
  },

  register: async (input) => {
    set({ isSubmitting: true, error: null })
    const result = await authService().register(input)

    if (!result.success || !result.info) {
      set({ isSubmitting: false, error: toApiError(result) })
      return false
    }

    clearGuestSession()
    const session = writeSession(result.info)
    set({
      user: session.user,
      token: session.token,
      status: 'authenticated',
      error: null,
      isSubmitting: false,
    })
    return true
  },

  continueAsGuest: () => {
    clearSession()
    clearGuestSession()
    startGuestSession()
    set({
      user: null,
      token: null,
      status: 'guest',
      error: null,
      isSubmitting: false,
    })
  },

  restore: async () => {
    const token = get().token
    if (!token) {
      set({
        user: null,
        status: isGuestSession() ? 'guest' : 'unauthenticated',
      })
      return
    }

    if (get().status === 'checking') return

    set({ status: 'checking', error: null })
    const result = await authService().me()

    // A logout or another login finished while /auth/me was in flight.
    if (get().token !== token) return

    if (result.status === 401 || result.status === 403) {
      clearSession()
      clearGuestSession()
      set({ user: null, token: null, status: 'unauthenticated', error: null })
      return
    }

    if (!result.success || !result.info) {
      set({
        status: get().user ? 'authenticated' : 'unauthenticated',
        error: toApiError(result),
      })
      return
    }

    updateSessionUser(result.info)
    set({ user: result.info, status: 'authenticated', error: null })
  },

  logout: () => {
    clearSession()
    clearGuestSession()
    set({
      user: null,
      token: null,
      status: 'unauthenticated',
      error: null,
      isSubmitting: false,
    })
  },

  clearError: () => set({ error: null }),

  hydrate: (token, user) => {
    clearGuestSession()
    updateSessionUser(user)
    set({ token, user, status: 'authenticated', error: null, isSubmitting: false })
  },

  hydrateGuest: () => {
    clearSession()
    startGuestSession()
    set({ user: null, token: null, status: 'guest', error: null, isSubmitting: false })
  },
}))
