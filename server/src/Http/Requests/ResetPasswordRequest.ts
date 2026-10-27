import { z } from 'zod';
import { ValidationException } from '../../Exceptions/ValidationException';

const MAX_TOKEN_LENGTH = 255;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

export const resetPasswordSchema = z.object({
    token: z
        .string({ message: 'Reset token is required' })
        .trim()
        .min(1, { message: 'Reset token is required' })
        .max(MAX_TOKEN_LENGTH, {
            message: `Reset token must be ${MAX_TOKEN_LENGTH} characters or less`,
        }),
    password: z
        .string({ message: 'Password is required' })
        .min(MIN_PASSWORD_LENGTH, {
            message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
        })
        .max(MAX_PASSWORD_LENGTH, {
            message: `Password must be ${MAX_PASSWORD_LENGTH} characters or less`,
        }),
});

export interface ResetPasswordData {
    token: string;
    password: string;
}

export class ResetPasswordRequest {
    static validate(body: unknown): ResetPasswordData {
        const parsed = resetPasswordSchema.safeParse(body);
        if (!parsed.success) {
            throw new ValidationException(
                'Invalid password reset payload',
                z.flattenError(parsed.error).fieldErrors
            );
        }
        return parsed.data;
    }
}
