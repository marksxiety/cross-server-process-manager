import { useAuthStore } from '@/stores/auth.store'
import { isDemoMode } from '@/lib/demo-mode'
import {
  canGuestVisit,
  hasEventAccess,
  hasPageAccess,
  type EventKey,
  type PageKey,
} from '@/lib/access-catalog'

export function useAccess() {
  const status = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)
  const demo = isDemoMode()

  const canVisit = (page: PageKey): boolean => {
    if (demo) return true
    if (status === 'authenticated' && user) return hasPageAccess(user, page)
    if (status === 'guest') return canGuestVisit(page)
    return false
  }

  const canDo = (event: EventKey): boolean => {
    if (demo) return true
    if (status === 'authenticated' && user) return hasEventAccess(user, event)
    return false
  }

  return {
    canVisit,
    canDo,
    isAdmin: demo || (status === 'authenticated' && user?.is_admin === true),
    isAuthenticated: demo || status === 'authenticated',
  }
}
