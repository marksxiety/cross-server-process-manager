import { z } from 'zod';
import { ValidationException } from '../../Exceptions/ValidationException';

const MAX_TOKEN_LENGTH = 255;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

export const verifyEmailSchema = z.object({
    token: z
        .string({ message: 'Verification token is required' })
        .trim()
        .min(1, { message: 'Verification token is required' })
        .max(MAX_TOKEN_LENGTH, {
            message: `Verification token must be ${MAX_TOKEN_LENGTH} characters or less`,
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

export interface VerifyEmailData {
    token: string;
    password: string;
}

export class VerifyEmailRequest {
    static validate(body: unknown): VerifyEmailData {
        const parsed = verifyEmailSchema.safeParse(body);
        if (!parsed.success) {
            throw new ValidationException(
                'Invalid verification payload',
                z.flattenError(parsed.error).fieldErrors
            );
        }
        return parsed.data;
    }
}
