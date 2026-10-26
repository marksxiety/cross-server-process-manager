import { redirect, type LoaderFunctionArgs } from 'react-router'
import { authService } from '@/api/services/auth.service'
import { isGuestSession, readSession } from '@/lib/auth-session'
import { isDemoMode } from '@/lib/demo-mode'
import { useAuthStore } from '@/stores/auth.store'

function loginRedirect(request: Request): Response {
  const from = new URL(request.url).pathname
  return redirect(`/login?from=${encodeURIComponent(from)}`)
}

/** Guards the authenticated/guest shell at `/`. */
export async function requireSession({ request }: LoaderFunctionArgs) {
  if (isDemoMode()) return null

  const session = readSession()
  if (!session) {
    if (isGuestSession()) {
      useAuthStore.getState().hydrateGuest()
      return { mode: 'guest' as const }
    }
    throw loginRedirect(request)
  }

  const result = await authService().me()

  if (result.status === 401 || result.status === 403) {
    useAuthStore.getState().logout()
    throw loginRedirect(request)
  }

  if (!result.success || !result.info) {
    // A network/5xx failure must not log out a valid session; fall back to the
    // cached user and let the page surface its own connection error.
    useAuthStore.getState().hydrate(session.token, session.user)
    return { mode: 'user' as const, stale: true }
  }

  useAuthStore.getState().hydrate(session.token, result.info)
  return { mode: 'user' as const, stale: false }
}

/** Blocks guests from the member-only pages; the parent loader validates tokens. */
export function requireMember({ request }: LoaderFunctionArgs): null {
  if (isDemoMode()) return null
  if (readSession()) return null
  if (isGuestSession()) throw redirect('/')
  throw loginRedirect(request)
}

/** Sends authenticated users away from /login and /register. Guests still see them. */
export function redirectIfAuthenticated({ request }: LoaderFunctionArgs): null {
  useAuthStore.getState().clearError()
  if (isDemoMode()) return null
  if (!readSession()) return null

  const from = new URL(request.url).searchParams.get('from')
  const target = from?.startsWith('/') && !from.startsWith('//') ? from : '/'
  throw redirect(target)
}
