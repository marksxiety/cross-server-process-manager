import { useEffect } from 'react'
import { AUTH_GUEST_KEY, AUTH_SESSION_KEY } from '@/lib/auth-session'
import { isDemoMode } from '@/lib/demo-mode'
import { useAuthStore } from '@/stores/auth.store'

/** Keeps auth state in sync when another tab changes localStorage. */
export function useAuthSync(): void {
  const syncFromStorage = useAuthStore((state) => state.syncFromStorage)

  useEffect(() => {
    if (isDemoMode()) return

    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea && event.storageArea !== window.localStorage) return
      if (
        event.key !== null &&
        event.key !== AUTH_SESSION_KEY &&
        event.key !== AUTH_GUEST_KEY
      ) {
        return
      }
      syncFromStorage()
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [syncFromStorage])
}
