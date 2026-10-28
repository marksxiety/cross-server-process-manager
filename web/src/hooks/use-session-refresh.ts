import { useEffect } from 'react'
import { isDemoMode } from '@/lib/demo-mode'
import { useAuthStore } from '@/stores/auth.store'

const MAX_REFRESH_LEAD_MS = 60_000
const MIN_RETRY_MS = 5_000

/** Renews the access token shortly before it expires, falling back to the retry. */
export function useSessionRefresh(): void {
  const expiresAt = useAuthStore((state) => state.expiresAt)
  const status = useAuthStore((state) => state.status)
  const refreshSession = useAuthStore((state) => state.refreshSession)

  useEffect(() => {
    if (isDemoMode()) return
    if (status !== 'authenticated' || expiresAt === null) return

    let timer: number | undefined
    let cancelled = false

    const schedule = (): void => {
      const current = useAuthStore.getState()
      if (current.status !== 'authenticated' || current.expiresAt === null) return

      const remaining = Math.max(current.expiresAt - Date.now(), 0)
      const lead = Math.min(MAX_REFRESH_LEAD_MS, Math.floor(remaining / 2))
      timer = window.setTimeout(run, Math.max(remaining - lead, 0))
    }

    const run = async (): Promise<void> => {
      const refreshed = await refreshSession()
      if (cancelled) return

      const current = useAuthStore.getState()
      if (refreshed || current.status !== 'authenticated') return

      // Transient failure: keep the session and try again at the deadline.
      if (current.expiresAt === null) return
      timer = window.setTimeout(run, Math.max(current.expiresAt - Date.now(), MIN_RETRY_MS))
    }

    schedule()

    const handleVisibility = (): void => {
      if (document.visibilityState !== 'visible') return

      const current = useAuthStore.getState()
      if (current.status !== 'authenticated' || current.expiresAt === null) return
      if (current.expiresAt - Date.now() <= MAX_REFRESH_LEAD_MS) void run()
    }

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      cancelled = true
      if (timer !== undefined) window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [expiresAt, status, refreshSession])
}
