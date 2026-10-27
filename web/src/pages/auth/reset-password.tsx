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
  resetPasswordSchema,
  type ResetPasswordFormInput,
  type ResetPasswordFormValues,
} from '@/schemas/auth.schema'
import type { ApiError } from '@/types/api'

const DEFAULT_FORM_VALUES: ResetPasswordFormInput = {
  password: '',
  confirm_password: '',
}

export function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [error, setError] = useState<ApiError | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormInput, unknown, ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  })

  const onSubmit = handleSubmit(async (values) => {
    if (token === '') return

    setError(null)
    const result = await authService().resetPassword({
      token,
      password: values.password,
    })

    if (result.success) {
      navigate('/login?reset=success', { replace: true })
      return
    }
    setError(toApiError(result))
  })

  if (token === '') {
    return (
      <AuthLayout
        title='Invalid link'
        description='This password reset link is missing or incomplete.'
      >
        <div className='grid gap-4'>
          <p className='text-sm text-muted-foreground'>
            Request a new reset link from the sign-in page.
          </p>
          <Button className='w-full' render={<Link to='/forgot-password' />}>
            Request a new link
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title='Reset password'
      description='Choose a new password for your account.'
    >
      <form className='grid gap-4' onSubmit={onSubmit} noValidate>
        {error && <ErrorAlert error={error} showDetails={false} />}

        <FieldGroup>
          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor='new-password'>New password</FieldLabel>
            <Input
              id='new-password'
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
          Reset password
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
