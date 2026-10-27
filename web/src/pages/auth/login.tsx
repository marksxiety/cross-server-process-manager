import { Link, useNavigate } from 'react-router'
import { AuthLayout } from '@/components/auth/auth-layout'
import { LoginForm } from '@/components/auth/login-form'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/stores/auth.store'

export function Login() {
  const navigate = useNavigate()
  const continueAsGuest = useAuthStore((state) => state.continueAsGuest)
  const clearError = useAuthStore((state) => state.clearError)

  const handleGuest = () => {
    clearError()
    continueAsGuest()
    navigate('/', { replace: true })
  }

  return (
    <AuthLayout
      title='Sign in'
      description='Enter your credentials to access your account.'
    >
      <LoginForm
        autoFocus
        onSuccess={() => navigate('/', { replace: true })}
      />

      <div className='my-4 flex items-center gap-3'>
        <Separator className='flex-1' />
        <span className='text-xs text-muted-foreground'>or</span>
        <Separator className='flex-1' />
      </div>

      <Button
        type='button'
        variant='outline'
        className='w-full'
        onClick={handleGuest}
      >
        Continue as guest
      </Button>

      <div className='mt-4 flex flex-col items-center gap-2 text-center text-xs text-muted-foreground'>
        <Link to='/register' className='text-primary hover:underline'>
          Create an account
        </Link>
        <Link to='/forgot-password' className='text-primary hover:underline'>
          Forgot password?
        </Link>
      </div>
    </AuthLayout>
  )
}
