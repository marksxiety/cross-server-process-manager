import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { AuthLayout } from '@/components/auth/auth-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // TODO: authenticate with the API
  }

  return (
    <AuthLayout
      title='Sign in'
      description='Enter your credentials to access your account.'
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

        <div className='grid gap-2'>
          <Label htmlFor='password'>Password</Label>
          <Input
            id='password'
            type='password'
            autoComplete='current-password'
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <Button type='submit' className='w-full'>
          Sign in
        </Button>
      </form>

      <div className='mt-4 flex flex-col gap-2 text-xs text-muted-foreground'>
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
