import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { AuthLayout } from '@/components/auth/auth-layout'
import { ErrorAlert } from '@/components/custom/error-alert'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import {
  loginSchema,
  type LoginFormInput,
  type LoginFormValues,
} from '@/schemas/auth.schema'
import { useAuthStore } from '@/stores/auth.store'

const DEFAULT_FORM_VALUES: LoginFormInput = {
  email: '',
  password: '',
}

function redirectTarget(from: string | null): string {
  return from?.startsWith('/') && !from.startsWith('//') ? from : '/'
}

export function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const login = useAuthStore((state) => state.login)
  const continueAsGuest = useAuthStore((state) => state.continueAsGuest)
  const requestError = useAuthStore((state) => state.error)
  const clearError = useAuthStore((state) => state.clearError)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormInput, unknown, LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  })

  const onSubmit = handleSubmit(async (values) => {
    clearError()
    const signedIn = await login(values)
    if (signedIn) {
      navigate(redirectTarget(searchParams.get('from')), { replace: true })
    }
  })

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
      <form className='grid gap-4' onSubmit={onSubmit} noValidate>
        {requestError && <ErrorAlert error={requestError} showDetails={false} />}

        <FieldGroup>
          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor='email'>Email</FieldLabel>
            <Input
              id='email'
              type='email'
              autoComplete='email'
              placeholder='you@example.com'
              aria-invalid={!!errors.email}
              {...register('email')}
            />
            <FieldError errors={[errors.email]} />
          </Field>

          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor='password'>Password</FieldLabel>
            <Input
              id='password'
              type='password'
              autoComplete='current-password'
              aria-invalid={!!errors.password}
              {...register('password')}
            />
            <FieldError errors={[errors.password]} />
          </Field>
        </FieldGroup>

        <Button type='submit' className='w-full' disabled={isSubmitting}>
          {isSubmitting && <Spinner className='size-4' />}
          Sign in
        </Button>
      </form>

      <div className='my-4 flex items-center gap-3'>
        <Separator className='flex-1' />
        <span className='text-xs text-muted-foreground'>or</span>
        <Separator className='flex-1' />
      </div>

      <Button
        type='button'
        variant='outline'
        className='w-full'
        disabled={isSubmitting}
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
