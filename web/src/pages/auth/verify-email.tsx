import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { authService } from '@/api/services/auth.service'
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
import { Spinner } from '@/components/ui/spinner'
import { toApiError } from '@/lib/error-code'
import {
  verifyEmailSchema,
  type VerifyEmailFormInput,
  type VerifyEmailFormValues,
} from '@/schemas/auth.schema'
import type { ApiError } from '@/types/api'

const DEFAULT_FORM_VALUES: VerifyEmailFormInput = {
  password: '',
  confirm_password: '',
}

export function VerifyEmail() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [error, setError] = useState<ApiError | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<VerifyEmailFormInput, unknown, VerifyEmailFormValues>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  })

  const onSubmit = handleSubmit(async (values) => {
    if (token === '') return

    setError(null)
    const result = await authService().verifyEmail(token, values.password)

    if (result.success) {
      navigate('/login?verified=success', { replace: true })
      return
    }
    setError(toApiError(result))
  })

  if (token === '') {
    return (
      <AuthLayout
        title='Invalid link'
        description='This verification link is missing or incomplete.'
      >
        <div className='grid gap-4'>
          <p className='text-sm text-muted-foreground'>
            Start the registration again to receive a new link.
          </p>
          <Button className='w-full' render={<Link to='/register' />}>
            Register again
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title='Finish creating your account'
      description='Choose a password to verify your email and complete registration.'
    >
      <form className='grid gap-4' onSubmit={onSubmit} noValidate>
        {error && <ErrorAlert error={error} showDetails={false} />}

        <FieldGroup>
          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor='password'>Password</FieldLabel>
            <Input
              id='password'
              type='password'
              autoComplete='new-password'
              aria-invalid={!!errors.password}
              {...register('password')}
            />
            <FieldError errors={[errors.password]} />
          </Field>

          <Field data-invalid={!!errors.confirm_password}>
            <FieldLabel htmlFor='confirm-password'>Confirm password</FieldLabel>
            <Input
              id='confirm-password'
              type='password'
              autoComplete='new-password'
              aria-invalid={!!errors.confirm_password}
              {...register('confirm_password')}
            />
            <FieldError errors={[errors.confirm_password]} />
          </Field>
        </FieldGroup>

        <Button type='submit' className='w-full' disabled={isSubmitting}>
          {isSubmitting && <Spinner className='size-4' />}
          Create account
        </Button>
      </form>

      <div className='mt-4 flex flex-col items-center gap-2 text-center text-xs text-muted-foreground'>
        {error && (
          <Link to='/register' className='text-primary hover:underline'>
            Request a new link
          </Link>
        )}
        <Link to='/login' className='text-primary hover:underline'>
          Back to sign in
        </Link>
      </div>
    </AuthLayout>
  )
}
