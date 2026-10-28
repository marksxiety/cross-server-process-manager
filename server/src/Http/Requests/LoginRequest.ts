import { z } from 'zod';
import { ValidationException } from '../../Exceptions/ValidationException';
import type { LoginData } from '../../Services/AuthService';

const MAX_EMAIL_LENGTH = 255;
const MAX_PASSWORD_LENGTH = 128;

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
});

export class LoginRequest {
    static validate(body: unknown): LoginData {
        const parsed = loginSchema.safeParse(body);
        if (!parsed.success) {
            throw new ValidationException(
                'Invalid login payload',
                z.flattenError(parsed.error).fieldErrors
            );
        }
        return parsed.data;
    }
}
