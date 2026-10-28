import { useState } from 'react'
import { authService } from '@/api/services/auth.service'
import { ErrorAlert } from '@/components/custom/error-alert'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { toApiError } from '@/lib/error-code'
import type { ApiError } from '@/types/api'

const RESEND_NOTICE = 'If that account needs verification, we sent a new link.'

type CheckEmailProps = {
  email?: string
  message: string
  onBackToSignIn: () => void
}

export function CheckEmail({ email, message, onBackToSignIn }: CheckEmailProps) {
  const [isResending, setIsResending] = useState(false)
  const [resendError, setResendError] = useState<ApiError | null>(null)
  const [resendNotice, setResendNotice] = useState<string | null>(null)

  const handleResend = async () => {
    if (!email) return

    setIsResending(true)
    setResendError(null)
    setResendNotice(null)
    const result = await authService().resendVerification(email)
    setIsResending(false)

    if (result.success) {
      setResendNotice(RESEND_NOTICE)
      return
    }
    setResendError(toApiError(result))
  }

  return (
    <div className='grid gap-4'>
      <p className='text-sm text-muted-foreground'>{message}</p>

      {resendError && <ErrorAlert error={resendError} showDetails={false} />}
      {resendNotice && (
        <p className='text-sm text-muted-foreground'>{resendNotice}</p>
      )}

      {email && (
        <Button
          type='button'
          variant='outline'
          className='w-full'
          disabled={isResending}
          onClick={() => void handleResend()}
        >
          {isResending && <Spinner className='size-4' />}
          Resend verification email
        </Button>
      )}

      <Button type='button' className='w-full' onClick={onBackToSignIn}>
        Back to sign in
      </Button>
    </div>
  )
}
