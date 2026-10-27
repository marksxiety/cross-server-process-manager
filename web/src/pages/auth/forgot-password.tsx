import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
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
  forgotPasswordSchema,
  type ForgotPasswordFormInput,
  type ForgotPasswordFormValues,
} from '@/schemas/auth.schema'
import type { ApiError } from '@/types/api'

const DEFAULT_FORM_VALUES: ForgotPasswordFormInput = { email: '' }

export function ForgotPassword() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormInput, unknown, ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  })

  const onSubmit = handleSubmit(async (values) => {
    setError(null)
    const result = await authService().forgotPassword(values.email)

    if (result.success) {
      setSent(true)
      return
    }
    setError(toApiError(result))
  })

  if (sent) {
    return (
      <AuthLayout
        title='Check your email'
        description='If an account exists for that email, we sent a password reset link.'
      >
        <div className='grid gap-4'>
          <p className='text-sm text-muted-foreground'>
            Open the link in the email to choose a new password. The link is
            single-use and expires soon.
          </p>
          <Button className='w-full' render={<Link to='/login' />}>
            Back to sign in
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title='Forgot password?'
      description='Enter your email and we will send you a reset link.'
    >
      <form className='grid gap-4' onSubmit={onSubmit} noValidate>
        {error && <ErrorAlert error={error} showDetails={false} />}

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
        </FieldGroup>

        <Button type='submit' className='w-full' disabled={isSubmitting}>
          {isSubmitting && <Spinner className='size-4' />}
          Send reset link
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
