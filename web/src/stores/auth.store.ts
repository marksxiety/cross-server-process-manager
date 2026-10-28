import { create } from 'zustand'
import { authService } from '@/api/services/auth.service'
import { refreshSession as requestRefresh } from '@/lib/auth-refresh'
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
  | 'expired'
  | 'signed-out'
  | 'guest'
  | 'unauthenticated'

interface AuthSnapshot {
  user: AuthUser | null
  token: string | null
  expiresAt: number | null
  status: AuthStatus
  error: ApiError | null
  isSubmitting: boolean
}

interface AuthState extends AuthSnapshot {
  login: (input: LoginInput) => Promise<boolean>
  register: (input: RegisterInput) => Promise<boolean>
  continueAsGuest: () => void
  restore: () => Promise<void>
  refreshSession: () => Promise<boolean>
  expireSession: () => void
  logout: () => void
  signOut: () => Promise<void>
  clearError: () => void
  syncFromStorage: () => void
  hydrate: (token: string, user: AuthUser, expiresAt: number) => void
  hydrateGuest: () => void
}

/** Rebuilt by tests after they stub localStorage. */
export function createInitialAuthState(): AuthSnapshot {
  const session = readSession()
  if (session) {
    return {
      user: session.user,
      token: session.token,
      expiresAt: session.expiresAt,
      status: 'idle',
      error: null,
      isSubmitting: false,
    }
  }

  if (isGuestSession()) {
    return {
      user: null,
      token: null,
      expiresAt: null,
      status: 'guest',
      error: null,
      isSubmitting: false,
    }
  }

  return {
    user: null,
    token: null,
    expiresAt: null,
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

    const session = writeSession(result.info)
    clearGuestSession()
    set({
      user: session.user,
      token: session.token,
      expiresAt: session.expiresAt,
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
    set({
      user: null,
      token: null,
      expiresAt: null,
      status: 'unauthenticated',
      error: null,
      isSubmitting: false,
    })
    return true
  },

  continueAsGuest: () => {
    startGuestSession()
    clearSession()
    set({
      user: null,
      token: null,
      expiresAt: null,
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
        expiresAt: null,
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
      const refreshed = await requestRefresh()

      if (refreshed.status === 'refreshed') {
        const retry = await authService().me()
        if (retry.success && retry.info) {
          updateSessionUser(retry.info)
          set({
            user: retry.info,
            token: refreshed.session.token,
            expiresAt: refreshed.session.expiresAt,
            status: 'authenticated',
            error: null,
          })
          return
        }
      }

      clearSession()
      clearGuestSession()
      set({
        user: null,
        token: null,
        expiresAt: null,
        status: 'unauthenticated',
        error: null,
      })
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
    const latest = readSession()
    set({
      user: result.info,
      token: latest?.token ?? token,
      expiresAt: latest?.expiresAt ?? get().expiresAt,
      status: 'authenticated',
      error: null,
    })
  },

  refreshSession: async () => {
    const result = await requestRefresh()

    switch (result.status) {
      case 'refreshed':
        set({
          user: result.session.user,
          token: result.session.token,
          expiresAt: result.session.expiresAt,
          status: 'authenticated',
          error: null,
          isSubmitting: false,
        })
        return true

      case 'missing':
        get().logout()
        return false

      case 'expired':
        get().expireSession()
        return false

      case 'rejected':
        clearSession()
        clearGuestSession()
        set({
          user: null,
          token: null,
          expiresAt: null,
          status: 'unauthenticated',
          error: null,
          isSubmitting: false,
        })
        return false

      case 'unreachable':
        return false
    }

    return false
  },

  expireSession: () => {
    clearGuestSession()
    clearSession()
    set({
      token: null,
      expiresAt: null,
      status: 'expired',
      error: null,
      isSubmitting: false,
    })
  },

  logout: () => {
    clearGuestSession()
    clearSession()
    set({
      user: null,
      token: null,
      expiresAt: null,
      status: 'unauthenticated',
      error: null,
      isSubmitting: false,
    })
  },

  signOut: async () => {
    try {
      await authService().logout()
    } catch (error) {
      console.error('Failed to revoke the session on the server', error)
    } finally {
      get().logout()
    }
  },

  clearError: () => set({ error: null }),

  syncFromStorage: () => {
    const previous = get()
    const session = readSession()
    if (session) {
      if (
        previous.token === session.token &&
        previous.expiresAt === session.expiresAt
      ) {
        return
      }

      set({
        user: session.user,
        token: session.token,
        expiresAt: session.expiresAt,
        status: 'authenticated',
        error: null,
        isSubmitting: false,
      })
      return
    }

    if (isGuestSession()) {
      if (previous.status === 'guest') return

      set({
        user: null,
        token: null,
        expiresAt: null,
        status: 'guest',
        error: null,
        isSubmitting: false,
      })
      return
    }

    if (previous.status === 'authenticated' || previous.status === 'checking') {
      const expired = previous.expiresAt !== null && previous.expiresAt <= Date.now()
      set({
        token: null,
        expiresAt: null,
        status: expired ? 'expired' : 'signed-out',
        error: null,
        isSubmitting: false,
      })
      return
    }

    if (previous.status === 'guest' || previous.status === 'idle') {
      set({
        user: null,
        token: null,
        expiresAt: null,
        status: 'unauthenticated',
        error: null,
        isSubmitting: false,
      })
    }
  },

  hydrate: (token, user, expiresAt) => {
    updateSessionUser(user)
    clearGuestSession()
    set({
      token,
      user,
      expiresAt,
      status: 'authenticated',
      error: null,
      isSubmitting: false,
    })
  },

  hydrateGuest: () => {
    startGuestSession()
    clearSession()
    set({
      user: null,
      token: null,
      expiresAt: null,
      status: 'guest',
      error: null,
      isSubmitting: false,
    })
  },
}))
