export const AUTH_UNAUTHORIZED_EVENT = 'xpm:auth-unauthorized'

/** Dispatched when an authenticated request is rejected with 401. */
export function notifyUnauthorized(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT))
}

export function onUnauthorized(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined
  window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handler)
  return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handler)
}
