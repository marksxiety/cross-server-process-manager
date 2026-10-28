import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { AuthLayout } from '@/components/auth/auth-layout'
import { CheckEmail } from '@/components/auth/check-email'
import { RegisterForm } from '@/components/auth/register-form'
import { useAuthStore } from '@/stores/auth.store'
import type { RegisterInput } from '@/types/auth'

export function Register() {
  const navigate = useNavigate()
  const registerAccount = useAuthStore((state) => state.register)
  const requestError = useAuthStore((state) => state.error)
  const clearError = useAuthStore((state) => state.clearError)
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)

  const handleRegister = async (values: RegisterInput): Promise<boolean> => {
    const created = await registerAccount(values)
    if (created) setRegisteredEmail(values.email)
    return created
  }

  if (registeredEmail) {
    return (
      <AuthLayout
        title='Check your email'
        description={`We sent a verification link to ${registeredEmail}.`}
      >
        <CheckEmail
          email={registeredEmail}
          message='Open the link to set your password and finish creating your account.'
          onBackToSignIn={() => navigate('/login', { replace: true })}
        />
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title='Create account'
      description='Enter your details to get started.'
    >
      <RegisterForm
        autoFocus
        onSubmit={handleRegister}
        requestError={requestError}
        clearError={clearError}
      />

      <div className='mt-4 text-center text-xs text-muted-foreground'>
        <Link to='/login' className='text-primary hover:underline'>
          Already have an account? Sign in
        </Link>
      </div>
    </AuthLayout>
  )
}
