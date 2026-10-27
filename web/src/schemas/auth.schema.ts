import { z } from 'zod'

const MAX_EMAIL_LENGTH = 255
const MAX_NAME_LENGTH = 100
const MIN_PASSWORD_LENGTH = 8
const MAX_PASSWORD_LENGTH = 128

export const authUserSchema = z.object({
  id: z.number(),
  email: z.string(),
  name: z.string(),
  is_admin: z.boolean(),
  is_active: z.boolean(),
  email_verified_at: z.string().nullable(),
  last_login_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  pages: z.array(z.string()),
  events: z.array(z.string()),
})

export const loginSchema = z.object({
  email: z
    .string({ message: 'Email is required' })
    .trim()
    .toLowerCase()
    .min(1, { message: 'Email is required' })
    .max(MAX_EMAIL_LENGTH, {
      message: `Email must be ${MAX_EMAIL_LENGTH} characters or less`,
    })
    .email({ message: 'Email must be a valid email address' }),
  password: z
    .string({ message: 'Password is required' })
    .min(1, { message: 'Password is required' })
    .max(MAX_PASSWORD_LENGTH, {
      message: `Password must be ${MAX_PASSWORD_LENGTH} characters or less`,
    }),
})

export const registerSchema = z.object({
  name: z
    .string({ message: 'Name is required' })
    .trim()
    .min(1, { message: 'Name is required' })
    .max(MAX_NAME_LENGTH, {
      message: `Name must be ${MAX_NAME_LENGTH} characters or less`,
    }),
  email: z
    .string({ message: 'Email is required' })
    .trim()
    .toLowerCase()
    .min(1, { message: 'Email is required' })
    .max(MAX_EMAIL_LENGTH, {
      message: `Email must be ${MAX_EMAIL_LENGTH} characters or less`,
    })
    .email({ message: 'Email must be a valid email address' }),
})

export const verifyEmailSchema = z
  .object({
    password: z
      .string({ message: 'Password is required' })
      .min(MIN_PASSWORD_LENGTH, {
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      })
      .max(MAX_PASSWORD_LENGTH, {
        message: `Password must be ${MAX_PASSWORD_LENGTH} characters or less`,
      }),
    confirm_password: z
      .string({ message: 'Confirm your password' })
      .min(1, { message: 'Confirm your password' }),
  })
  .refine((values) => values.password === values.confirm_password, {
    path: ['confirm_password'],
    message: 'Passwords do not match',
  })

export const forgotPasswordSchema = z.object({
  email: z
    .string({ message: 'Email is required' })
    .trim()
    .toLowerCase()
    .min(1, { message: 'Email is required' })
    .max(MAX_EMAIL_LENGTH, {
      message: `Email must be ${MAX_EMAIL_LENGTH} characters or less`,
    })
    .email({ message: 'Email must be a valid email address' }),
})

export const resetPasswordSchema = z
  .object({
    password: z
      .string({ message: 'Password is required' })
      .min(MIN_PASSWORD_LENGTH, {
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      })
      .max(MAX_PASSWORD_LENGTH, {
        message: `Password must be ${MAX_PASSWORD_LENGTH} characters or less`,
      }),
    confirm_password: z
      .string({ message: 'Confirm your password' })
      .min(1, { message: 'Confirm your password' }),
  })
  .refine((values) => values.password === values.confirm_password, {
    path: ['confirm_password'],
    message: 'Passwords do not match',
  })

export type LoginFormInput = z.input<typeof loginSchema>
export type LoginFormValues = z.output<typeof loginSchema>
export type RegisterFormInput = z.input<typeof registerSchema>
export type RegisterFormValues = z.output<typeof registerSchema>
export type VerifyEmailFormInput = z.input<typeof verifyEmailSchema>
export type VerifyEmailFormValues = z.output<typeof verifyEmailSchema>
export type ForgotPasswordFormInput = z.input<typeof forgotPasswordSchema>
export type ForgotPasswordFormValues = z.output<typeof forgotPasswordSchema>
export type ResetPasswordFormInput = z.input<typeof resetPasswordSchema>
export type ResetPasswordFormValues = z.output<typeof resetPasswordSchema>
