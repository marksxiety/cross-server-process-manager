import { LogOut } from 'lucide-react'
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

export function SignedOutDialog() {
  const status = useAuthStore((state) => state.status)
  const logout = useAuthStore((state) => state.logout)
  const navigate = useNavigate()

  const handleSignIn = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <AlertDialog open={status === 'signed-out'}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <LogOut className='-scale-x-100' strokeWidth={2} />
          </AlertDialogMedia>
          <AlertDialogTitle>You've been signed out</AlertDialogTitle>
          <AlertDialogDescription>
            Your session has ended. Sign in again to continue.
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
