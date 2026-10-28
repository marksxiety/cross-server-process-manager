import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { useAuthSync } from '@/hooks/use-auth-sync'
import {
  isAuthPath,
  isAuthenticatedRedirectPath,
  isMemberPath,
} from '@/lib/auth-paths'
import { onUnauthorized } from '@/lib/auth-events'
import { isDemoMode } from '@/lib/demo-mode'
import { useAuthStore } from '@/stores/auth.store'

/** Global auth shell: cross-tab sync plus redirects for status changes. */
export function AuthRoot() {
  useAuthSync()
  const status = useAuthStore((state) => state.status)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => onUnauthorized(() => useAuthStore.getState().logout()), [])

  useEffect(() => {
    if (isDemoMode()) return

    const { pathname } = location

    if (status === 'unauthenticated') {
      if (!isAuthPath(pathname)) {
        navigate('/login', { replace: true })
      }
      return
    }

    if (status === 'guest' && isMemberPath(pathname)) {
      navigate('/', { replace: true })
      return
    }

    if (status === 'authenticated' && isAuthenticatedRedirectPath(pathname)) {
      navigate('/', { replace: true })
    }
  }, [status, location, navigate])

  return <Outlet />
}
