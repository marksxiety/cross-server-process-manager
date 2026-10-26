import { isDemoMode } from '@/lib/demo-mode'
import { useAuthStore } from '@/stores/auth.store'

/** True when the current visitor may mutate servers, templates or processes. */
export function useCanManage(): boolean {
  const status = useAuthStore((state) => state.status)
  return isDemoMode() || status === 'authenticated'
}
