import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { AuthLayout } from '@/components/auth/auth-layout'
import { CheckEmail } from '@/components/auth/check-email'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'

export function ForgotPassword() {
  const navigate = useNavigate()
  const [sent, setSent] = useState(false)

  if (sent) {
    return (
      <AuthLayout
        title='Check your email'
        description='If an account exists for that email, we sent a password reset link.'
      >
        <CheckEmail
          message='Open the link in the email to choose a new password. The link is single-use and expires soon.'
          onBackToSignIn={() => navigate('/login', { replace: true })}
        />
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title='Forgot password?'
      description='Enter your email and we will send you a reset link.'
    >
      <ForgotPasswordForm autoFocus onSent={() => setSent(true)} />

      <div className='mt-4 text-xs text-muted-foreground'>
        <Link to='/login' className='text-primary hover:underline'>
          Back to sign in
        </Link>
      </div>
    </AuthLayout>
  )
}
