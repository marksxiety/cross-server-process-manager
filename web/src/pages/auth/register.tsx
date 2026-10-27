import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
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
  registerSchema,
  type RegisterFormInput,
  type RegisterFormValues,
} from '@/schemas/auth.schema'
import { useAuthStore } from '@/stores/auth.store'
import type { RegisterInput } from '@/types/auth'
import type { ApiError } from '@/types/api'

const DEFAULT_FORM_VALUES: RegisterFormInput = {
  name: '',
  email: '',
}

export function Register() {
  const navigate = useNavigate()
  const registerAccount = useAuthStore((state) => state.register)
  const requestError = useAuthStore((state) => state.error)
  const clearError = useAuthStore((state) => state.clearError)
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)
  const [resendError, setResendError] = useState<ApiError | null>(null)
  const [resendNotice, setResendNotice] = useState<string | null>(null)
  const [isResending, setIsResending] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormInput, unknown, RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  })

  const onSubmit = handleSubmit(async (values) => {
    clearError()

    const payload: RegisterInput = {
      name: values.name,
      email: values.email,
    }

    if (await registerAccount(payload)) {
      setRegisteredEmail(values.email)
    }
  })

  const handleResend = async () => {
    if (!registeredEmail) return

    setIsResending(true)
    setResendError(null)
    setResendNotice(null)
    const result = await authService().resendVerification(registeredEmail)
    setIsResending(false)

    if (result.success) {
      setResendNotice('If that account needs verification, we sent a new link.')
      return
    }
    setResendError(toApiError(result))
  }

  if (registeredEmail) {
    return (
      <AuthLayout
        title='Check your email'
        description={`We sent a verification link to ${registeredEmail}.`}
      >
        <div className='grid gap-4'>
          <p className='text-sm text-muted-foreground'>
            Open the link to set your password and finish creating your account.
          </p>

          {resendError && <ErrorAlert error={resendError} showDetails={false} />}
          {resendNotice && (
            <p className='text-sm text-muted-foreground'>{resendNotice}</p>
          )}

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

          <Button
            type='button'
            className='w-full'
            onClick={() => navigate('/login', { replace: true })}
          >
            Back to sign in
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title='Create account'
      description='Enter your details to get started.'
    >
      <form className='grid gap-4' onSubmit={onSubmit} noValidate>
        {requestError && <ErrorAlert error={requestError} showDetails={false} />}

        <FieldGroup>
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor='name'>Name</FieldLabel>
            <Input
              id='name'
              type='text'
              autoComplete='name'
              aria-invalid={!!errors.name}
              {...register('name')}
            />
            <FieldError errors={[errors.name]} />
          </Field>

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
          Create account
        </Button>
      </form>

      <div className='mt-4 text-center text-xs text-muted-foreground'>
        <Link to='/login' className='text-primary hover:underline'>
          Already have an account? Sign in
        </Link>
      </div>
    </AuthLayout>
  )
}
