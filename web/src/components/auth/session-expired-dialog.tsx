import { Clock } from 'lucide-react'
import { useNavigate } from 'react-router'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useAuthStore } from '@/stores/auth.store'

export function SessionExpiredDialog() {
  const status = useAuthStore((state) => state.status)
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const navigate = useNavigate()

  const handleSignIn = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <AlertDialog open={status === 'expired'}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Clock strokeWidth={2} />
          </AlertDialogMedia>
          <AlertDialogTitle>Session expired</AlertDialogTitle>
          <AlertDialogDescription>
            {user
              ? `The session for ${user.email} has expired. `
              : 'Your session has expired. '}
            Sign in again to continue.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction className='w-full' onClick={handleSignIn}>
            Sign in
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
