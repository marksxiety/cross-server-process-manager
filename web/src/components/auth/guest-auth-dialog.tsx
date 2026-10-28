import { useState } from 'react'
import { authService } from '@/api/services/auth.service'
import { CheckEmail } from '@/components/auth/check-email'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { LoginForm } from '@/components/auth/login-form'
import { RegisterForm } from '@/components/auth/register-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toApiError } from '@/lib/error-code'
import { useAuthStore } from '@/stores/auth.store'
import type { ApiError } from '@/types/api'
import type { RegisterInput } from '@/types/auth'

type GuestAuthMode =
  | 'signin'
  | 'register'
  | 'forgot'
  | 'register-sent'
  | 'forgot-sent'

type GuestAuthDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type GuestAuthHeader = {
  title: string
  description: string
}

function headerFor(mode: GuestAuthMode, email: string | null): GuestAuthHeader {
  switch (mode) {
    case 'signin':
      return {
        title: 'Sign in to XPM',
        description:
          'Sign in to manage servers, templates, and processes. You can keep browsing as a guest.',
      }
    case 'register':
      return {
        title: 'Create account',
        description: 'Enter your details to get started.',
      }
    case 'forgot':
      return {
        title: 'Forgot password?',
        description: 'Enter your email and we will send you a reset link.',
      }
    case 'register-sent':
      return {
        title: 'Check your email',
        description: email
          ? `We sent a verification link to ${email}.`
          : 'We sent a verification link.',
      }
    case 'forgot-sent':
      return {
        title: 'Check your email',
        description:
          'If an account exists for that email, we sent a password reset link.',
      }
    default:
      return {
        title: 'Sign in to XPM',
        description: 'Sign in to manage servers, templates, and processes.',
      }
  }
}

export function GuestAuthDialog({ open, onOpenChange }: GuestAuthDialogProps) {
  const clearError = useAuthStore((state) => state.clearError)
  const [mode, setMode] = useState<GuestAuthMode>('signin')
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)
  const [registerError, setRegisterError] = useState<ApiError | null>(null)

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setMode('signin')
      setRegisteredEmail(null)
      setRegisterError(null)
      clearError()
    }
    onOpenChange(nextOpen)
  }

  const handleRegister = async (values: RegisterInput): Promise<boolean> => {
    setRegisterError(null)
    const result = await authService().register(values)

    if (result.success) {
      setRegisteredEmail(result.info?.email ?? values.email)
      setMode('register-sent')
      return true
    }

    setRegisterError(toApiError(result))
    return false
  }

  const header = headerFor(mode, registeredEmail)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='max-h-[90dvh] overflow-y-auto sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle>{header.title}</DialogTitle>
          <DialogDescription>{header.description}</DialogDescription>
        </DialogHeader>

        {mode === 'signin' && (
          <>
            <LoginForm autoFocus onSuccess={() => handleOpenChange(false)} />

            <div className='flex flex-col items-center gap-2 text-center text-xs text-muted-foreground'>
              <button
                type='button'
                className='text-primary hover:underline'
                onClick={() => {
                  clearError()
                  setRegisterError(null)
                  setMode('register')
                }}
              >
                Create an account
              </button>
              <button
                type='button'
                className='text-primary hover:underline'
                onClick={() => {
                  clearError()
                  setMode('forgot')
                }}
              >
                Forgot password?
              </button>
            </div>
          </>
        )}

        {mode === 'register' && (
          <>
            <RegisterForm
              autoFocus
              onSubmit={handleRegister}
              requestError={registerError}
              clearError={() => setRegisterError(null)}
            />

            <div className='text-xs text-muted-foreground'>
              <button
                type='button'
                className='text-primary hover:underline'
                onClick={() => {
                  setRegisterError(null)
                  setMode('signin')
                }}
              >
                Back to sign in
              </button>
            </div>
          </>
        )}

        {mode === 'forgot' && (
          <>
            <ForgotPasswordForm
              autoFocus
              onSent={() => setMode('forgot-sent')}
            />

            <div className='text-xs text-muted-foreground'>
              <button
                type='button'
                className='text-primary hover:underline'
                onClick={() => setMode('signin')}
              >
                Back to sign in
              </button>
            </div>
          </>
        )}

        {mode === 'register-sent' && registeredEmail && (
          <CheckEmail
            email={registeredEmail}
            message='Open the link to set your password and finish creating your account.'
            onBackToSignIn={() => setMode('signin')}
          />
        )}

        {mode === 'forgot-sent' && (
          <CheckEmail
            message='Open the link in the email to choose a new password. The link is single-use and expires soon.'
            onBackToSignIn={() => setMode('signin')}
          />
        )}

        <DialogFooter>
          <DialogClose
            render={<Button variant='outline' className='w-full' />}
          >
            Stay as guest
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
