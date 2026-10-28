import { z } from 'zod';
import { ValidationException } from '../../Exceptions/ValidationException';
import type { RegistrationInput } from '../../Services/RegistrationService';

const MAX_EMAIL_LENGTH = 255;
const MAX_NAME_LENGTH = 100;

export const registerSchema = z.object({
    email: z
        .string({ message: 'Email is required' })
        .trim()
        .toLowerCase()
        .min(1, { message: 'Email is required' })
        .max(MAX_EMAIL_LENGTH, {
            message: `Email must be ${MAX_EMAIL_LENGTH} characters or less`,
        })
        .email({ message: 'Email must be a valid email address' }),
    name: z
        .string({ message: 'Name is required' })
        .trim()
        .min(1, { message: 'Name is required' })
        .max(MAX_NAME_LENGTH, {
            message: `Name must be ${MAX_NAME_LENGTH} characters or less`,
        }),
});

export class RegisterRequest {
    static validate(body: unknown): RegistrationInput {
        const parsed = registerSchema.safeParse(body);
        if (!parsed.success) {
            throw new ValidationException(
                'Invalid registration payload',
                z.flattenError(parsed.error).fieldErrors
            );
        }
        return parsed.data;
    }
}
