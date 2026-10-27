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
  loginSchema,
  type LoginFormInput,
  type LoginFormValues,
} from '@/schemas/auth.schema'
import { useAuthStore } from '@/stores/auth.store'

const DEFAULT_FORM_VALUES: LoginFormInput = {
  email: '',
  password: '',
}

type LoginFormProps = {
  onSuccess: () => void
  autoFocus?: boolean
}

export function LoginForm({ onSuccess, autoFocus = false }: LoginFormProps) {
  const login = useAuthStore((state) => state.login)
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
    if (await login(values)) onSuccess()
  })

  return (
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
            autoFocus={autoFocus}
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
  )
}
