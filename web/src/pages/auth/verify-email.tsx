import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { REGEXP_ONLY_DIGITS } from 'input-otp'
import { AuthLayout } from '@/components/auth/auth-layout'
import { Button } from '@/components/ui/button'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import { Label } from '@/components/ui/label'

const CODE_SLOTS = [0, 1, 2, 3, 4, 5]

export function VerifyEmail() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // TODO: verify the code through the API
    navigate('/login')
  }

  const handleResend = () => {
    // TODO: request a new code through the API
  }

  return (
    <AuthLayout
      title='Verify your email'
      description='Confirm the code we sent to your inbox.'
    >
      <form className='grid gap-4' onSubmit={handleSubmit}>
        <div className='grid gap-2'>
          <Label htmlFor='code'>Verification code</Label>
          <div className='flex justify-center'>
            <InputOTP
              id='code'
              maxLength={6}
              pattern={REGEXP_ONLY_DIGITS}
              value={code}
              onChange={setCode}
            >
              <InputOTPGroup>
                {CODE_SLOTS.map((index) => (
                  <InputOTPSlot key={index} index={index} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <p className='text-xs text-muted-foreground'>
            Enter the 6-digit code sent to your email
          </p>
        </div>

        <Button type='submit' className='w-full'>
          Verify
        </Button>
        <Button
          type='button'
          variant='outline'
          className='w-full'
          onClick={handleResend}
        >
          Resend code
        </Button>
      </form>
    </AuthLayout>
  )
}
