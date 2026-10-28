const AUTH_PATHS = new Set([
  '/login',
  '/register',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/forbidden',
])

const AUTHENTICATED_REDIRECT_PATHS = new Set([
  '/login',
  '/register',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
])

/** Public auth screens: an unauthenticated visitor may stay here. */
export function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.has(pathname)
}

/**
 * Auth screens a signed-in user must be redirected away from. Visitors without
 * a session - including guests - may stay on these pages.
 */
export function isAuthenticatedRedirectPath(pathname: string): boolean {
  return AUTHENTICATED_REDIRECT_PATHS.has(pathname)
}

/**
 * Member-only pages. `/server/:name/metrics` is guest-allowed and therefore
 * does not match; only the server list itself is member-only.
 */
export function isMemberPath(pathname: string): boolean {
  if (pathname === '/server') return true
  return pathname.startsWith('/template') || pathname.startsWith('/process')
}
