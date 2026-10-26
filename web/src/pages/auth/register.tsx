import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
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
import {
  registerSchema,
  type RegisterFormInput,
  type RegisterFormValues,
} from '@/schemas/auth.schema'
import { useAuthStore } from '@/stores/auth.store'
import type { RegisterInput } from '@/types/auth'

const DEFAULT_FORM_VALUES: RegisterFormInput = {
  name: '',
  email: '',
  password: '',
  confirm_password: '',
}

export function Register() {
  const navigate = useNavigate()
  const registerAccount = useAuthStore((state) => state.register)
  const requestError = useAuthStore((state) => state.error)
  const clearError = useAuthStore((state) => state.clearError)

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
      password: values.password,
    }

    const created = await registerAccount(payload)
    if (created) navigate('/', { replace: true })
  })

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

      <div className='mt-4 text-center text-xs text-muted-foreground'>
        <Link to='/login' className='text-primary hover:underline'>
          Already have an account? Sign in
        </Link>
      </div>
    </AuthLayout>
  )
}
