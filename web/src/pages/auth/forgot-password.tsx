import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { AuthLayout } from '@/components/auth/auth-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // TODO: request a reset code through the API
    navigate('/reset-password')
  }

  return (
    <AuthLayout
      title='Forgot password?'
      description='Enter your email and we will send you a reset code.'
    >
      <form className='grid gap-4' onSubmit={handleSubmit}>
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

        <Button type='submit' className='w-full'>
          Send code
        </Button>
      </form>

      <div className='mt-4 text-xs text-muted-foreground'>
        <Link to='/login' className='text-primary hover:underline'>
          Back to sign in
        </Link>
      </div>
    </AuthLayout>
  )
}
