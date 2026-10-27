import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth.store'

/** Expires the in-memory session when the stored deadline passes. */
export function useSessionExpiry(): void {
  const expiresAt = useAuthStore((state) => state.expiresAt)
  const status = useAuthStore((state) => state.status)
  const expireSession = useAuthStore((state) => state.expireSession)

  useEffect(() => {
    if (status !== 'authenticated' || expiresAt === null) return

    const remaining = Math.max(expiresAt - Date.now(), 0)
    const timer = window.setTimeout(expireSession, remaining)

    // Background tabs throttle timers; re-check as soon as the tab returns.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && Date.now() >= expiresAt) {
        expireSession()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [expiresAt, status, expireSession])
}
