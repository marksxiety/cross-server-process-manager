import { z } from 'zod';
import { ValidationException } from '../../Exceptions/ValidationException';
import type { AdminUserUpdate } from '../../Services/AdminService';

const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 255;

const adminUserSchema = z
    .object({
        name: z
            .string({ message: 'Name must be a string' })
            .trim()
            .min(1, { message: 'Name is required' })
            .max(MAX_NAME_LENGTH, {
                message: `Name must be ${MAX_NAME_LENGTH} characters or less`,
            })
            .optional(),
        email: z
            .string({ message: 'Email must be a string' })
            .trim()
            .toLowerCase()
            .min(1, { message: 'Email is required' })
            .max(MAX_EMAIL_LENGTH, {
                message: `Email must be ${MAX_EMAIL_LENGTH} characters or less`,
            })
            .email({ message: 'Email must be a valid email address' })
            .optional(),
        is_active: z.boolean({ message: 'Active must be a boolean' }).optional(),
        is_admin: z.boolean({ message: 'Admin must be a boolean' }).optional(),
    })
    .refine((value) => Object.values(value).some((field) => field !== undefined), {
        path: ['form'],
        message: 'Provide at least one field to update',
    });

export class UpdateAdminUserRequest {
    static validate(body: unknown): AdminUserUpdate {
        const parsed = adminUserSchema.safeParse(body);
        if (!parsed.success) {
            throw new ValidationException(
                'Invalid user payload',
                z.flattenError(parsed.error).fieldErrors
            );
        }
        return parsed.data;
    }
}
