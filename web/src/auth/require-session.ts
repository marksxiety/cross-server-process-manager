import { redirect } from 'react-router'
import { authService } from '@/api/services/auth.service'
import { isGuestSession, readSession } from '@/lib/auth-session'
import { canGuestVisit, hasPageAccess, type PageKey } from '@/lib/access-catalog'
import { isDemoMode } from '@/lib/demo-mode'
import { useAuthStore } from '@/stores/auth.store'

function loginRedirect(): Response {
  return redirect('/login')
}

/** Guards the authenticated/guest shell at `/`. */
export async function requireSession() {
  if (isDemoMode()) return null

  const session = readSession()
  if (!session) {
    if (isGuestSession()) {
      useAuthStore.getState().hydrateGuest()
      return { mode: 'guest' as const }
    }
    throw loginRedirect()
  }

  const result = await authService().me()

  if (result.status === 401 || result.status === 403) {
    const refreshed = await useAuthStore.getState().refreshSession()
    const latest = readSession()

    if (refreshed && latest) {
      const retry = await authService().me()
      if (retry.success && retry.info) {
        useAuthStore.getState().hydrate(latest.token, retry.info, latest.expiresAt)
        return { mode: 'user' as const, stale: false }
      }
    }

    // The refresh failed transiently, so the session is still worth keeping.
    if (latest) {
      useAuthStore.getState().hydrate(latest.token, latest.user, latest.expiresAt)
      return { mode: 'user' as const, stale: true }
    }

    useAuthStore.getState().logout()
    throw loginRedirect()
  }

  const latest = readSession() ?? session

  if (!result.success || !result.info) {
    // A network/5xx failure must not log out a valid session; fall back to the
    // cached user and let the page surface its own connection error.
    useAuthStore.getState().hydrate(latest.token, latest.user, latest.expiresAt)
    return { mode: 'user' as const, stale: true }
  }

  useAuthStore.getState().hydrate(latest.token, result.info, latest.expiresAt)
  return { mode: 'user' as const, stale: false }
}

/** Requires the current account to have access to a page. */
export function requirePage(page: PageKey): () => null {
  return () => {
    if (isDemoMode()) return null

    const session = readSession()
    if (session) {
      if (hasPageAccess(session.user, page)) return null
      throw redirect('/forbidden')
    }

    if (isGuestSession()) {
      if (canGuestVisit(page)) return null
      throw redirect('/')
    }

    throw loginRedirect()
  }
}

/** Requires the current account to be an admin. */
export function requireAdmin(): null {
  if (isDemoMode()) return null

  const session = readSession()
  if (session) {
    if (session.user.is_admin) return null
    throw redirect('/forbidden')
  }

  throw loginRedirect()
}

/** Sends authenticated users away from /login and /register. Guests still see them. */
export function redirectIfAuthenticated(): null {
  useAuthStore.getState().clearError()
  if (isDemoMode()) return null
  if (!readSession()) return null
  throw redirect('/')
}
