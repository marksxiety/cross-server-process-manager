import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { authService } from '@/api/services/auth.service'
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

type ForgotPasswordFormProps = {
  onSent: () => void
  autoFocus?: boolean
}

export function ForgotPasswordForm({
  onSent,
  autoFocus = false,
}: ForgotPasswordFormProps) {
  const [error, setError] = useState<ApiError | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormInput, unknown, ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  })

  const submit = handleSubmit(async (values) => {
    setError(null)
    const result = await authService().forgotPassword(values.email)

    if (result.success) {
      onSent()
      return
    }
    setError(toApiError(result))
  })

  return (
    <form className='grid gap-4' onSubmit={submit} noValidate>
      {error && <ErrorAlert error={error} showDetails={false} />}

      <FieldGroup>
        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor='forgot-email'>Email</FieldLabel>
          <Input
            id='forgot-email'
            type='email'
            autoComplete='email'
            placeholder='you@example.com'
            aria-invalid={!!errors.email}
            autoFocus={autoFocus}
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
  )
}
