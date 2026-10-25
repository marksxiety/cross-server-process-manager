import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { REGEXP_ONLY_DIGITS } from 'input-otp'
import { AuthLayout } from '@/components/auth/auth-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import { Label } from '@/components/ui/label'

const CODE_SLOTS = [0, 1, 2, 3, 4, 5]

export function ResetPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleVerify = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // TODO: verify the code through the API
    setStep(2)
  }

  const handleReset = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // TODO: reset the password through the API
    navigate('/login')
  }

  return (
    <AuthLayout
      title='Reset password'
      description={
        step === 1
          ? 'Enter your email and the code we sent you.'
          : 'Choose a new password for your account.'
      }
    >
      {step === 1 ? (
        <form className='grid gap-4' onSubmit={handleVerify}>
          <div className='grid gap-2'>
            <Label htmlFor='email'>Email</Label>
            <Input
              id='email'
              type='email'
              autoComplete='email'
              placeholder='you@example.com'
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

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
          </div>

          <Button type='submit' className='w-full'>
            Verify code
          </Button>
        </form>
      ) : (
        <form className='grid gap-4' onSubmit={handleReset}>
          <div className='grid gap-2'>
            <Label htmlFor='new-password'>New password</Label>
            <Input
              id='new-password'
              type='password'
              autoComplete='new-password'
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <div className='grid gap-2'>
            <Label htmlFor='confirm-password'>Confirm password</Label>
            <Input
              id='confirm-password'
              type='password'
              autoComplete='new-password'
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </div>

          <Button type='submit' className='w-full'>
            Reset password
          </Button>
        </form>
      )}

      <div className='mt-4 text-xs text-muted-foreground'>
        <Link to='/login' className='text-primary hover:underline'>
          Back to sign in
        </Link>
      </div>
    </AuthLayout>
  )
}
