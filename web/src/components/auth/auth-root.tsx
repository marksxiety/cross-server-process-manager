import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { useAuthSync } from '@/hooks/use-auth-sync'
import { isAuthPath, isCredentialPath, isMemberPath } from '@/lib/auth-paths'
import { isDemoMode } from '@/lib/demo-mode'
import { useAuthStore } from '@/stores/auth.store'

/** Global auth shell: cross-tab sync plus redirects for status changes. */
export function AuthRoot() {
  useAuthSync()
  const status = useAuthStore((state) => state.status)
  const navigate = useNavigate()
  const location = useLocation()

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

    if (status === 'authenticated' && isCredentialPath(pathname)) {
      navigate('/', { replace: true })
    }
  }, [status, location, navigate])

  return <Outlet />
}
