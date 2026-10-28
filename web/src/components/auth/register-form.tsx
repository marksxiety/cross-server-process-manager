import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
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
import {
  registerSchema,
  type RegisterFormInput,
  type RegisterFormValues,
} from '@/schemas/auth.schema'
import type { ApiError } from '@/types/api'
import type { RegisterInput } from '@/types/auth'

const DEFAULT_FORM_VALUES: RegisterFormInput = {
  name: '',
  email: '',
}

type RegisterFormProps = {
  onSubmit: (values: RegisterInput) => Promise<boolean>
  requestError: ApiError | null
  clearError: () => void
  autoFocus?: boolean
}

export function RegisterForm({
  onSubmit,
  requestError,
  clearError,
  autoFocus = false,
}: RegisterFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormInput, unknown, RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  })

  const submit = handleSubmit(async (values) => {
    clearError()
    await onSubmit({ name: values.name, email: values.email })
  })

  return (
    <form className='grid gap-4' onSubmit={submit} noValidate>
      {requestError && <ErrorAlert error={requestError} showDetails={false} />}

      <FieldGroup>
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor='register-name'>Name</FieldLabel>
          <Input
            id='register-name'
            type='text'
            autoComplete='name'
            aria-invalid={!!errors.name}
            autoFocus={autoFocus}
            {...register('name')}
          />
          <FieldError errors={[errors.name]} />
        </Field>

        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor='register-email'>Email</FieldLabel>
          <Input
            id='register-email'
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
  )
}
