import { z } from 'zod';
import { ValidationException } from '../../Exceptions/ValidationException';

const MAX_EMAIL_LENGTH = 255;

export const emailAddressSchema = z.object({
    email: z
        .string({ message: 'Email is required' })
        .trim()
        .toLowerCase()
        .min(1, { message: 'Email is required' })
        .max(MAX_EMAIL_LENGTH, {
            message: `Email must be ${MAX_EMAIL_LENGTH} characters or less`,
        })
        .email({ message: 'Email must be a valid email address' }),
});

export interface EmailAddress {
    email: string;
}

export class EmailAddressRequest {
    static validate(body: unknown, message = 'Invalid email payload'): EmailAddress {
        const parsed = emailAddressSchema.safeParse(body);
        if (!parsed.success) {
            throw new ValidationException(
                message,
                z.flattenError(parsed.error).fieldErrors
            );
        }
        return parsed.data;
    }
}
