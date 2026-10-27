const AUTH_PATHS = new Set([
  '/login',
  '/register',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/forbidden',
])

const CREDENTIAL_PATHS = new Set(['/login', '/register'])

/** Public auth screens: an unauthenticated visitor may stay here. */
export function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.has(pathname)
}

/** Screens that a signed-in user should be redirected away from. */
export function isCredentialPath(pathname: string): boolean {
  return CREDENTIAL_PATHS.has(pathname)
}

/**
 * Member-only pages. `/server/:name/metrics` is guest-allowed and therefore
 * does not match; only the server list itself is member-only.
 */
export function isMemberPath(pathname: string): boolean {
  if (pathname === '/server') return true
  return pathname.startsWith('/template') || pathname.startsWith('/process')
}
