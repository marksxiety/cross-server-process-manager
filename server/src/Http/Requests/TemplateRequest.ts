import { z } from 'zod';
import { ValidationException } from '../../Exceptions/ValidationException';
import type { TemplateData } from '../../Models/Template';
import type { TemplateValuesData } from '../../Models/TemplateKey';

const MAX_PROPERTY_KEY_LENGTH = 100;
const MAX_TEMPLATE_NAME_LENGTH = 100;
const MAX_METADATA_LENGTH = 255;

export const templateValuesSchema = z.record(
    z
        .string({ message: 'Key is required' })
        .trim()
        .min(1, { message: 'Key is required' })
        .max(MAX_PROPERTY_KEY_LENGTH, {
            message: `Key must be ${MAX_PROPERTY_KEY_LENGTH} characters or less`,
        }),
    z.unknown()
);

export const templateInputSchema = z.object({
    template_name: z
        .string({ message: 'Template name is required' })
        .trim()
        .min(1, { message: 'Template name is required' })
        .max(MAX_TEMPLATE_NAME_LENGTH, {
            message: `Template name must be ${MAX_TEMPLATE_NAME_LENGTH} characters or less`,
        }),
    category: z
        .string({ message: 'Category must be a string' })
        .trim()
        .max(MAX_METADATA_LENGTH, {
            message: `Category must be ${MAX_METADATA_LENGTH} characters or less`,
        })
        .nullable()
        .optional(),
    description: z
        .string({ message: 'Description must be a string' })
        .trim()
        .max(MAX_METADATA_LENGTH, {
            message: `Description must be ${MAX_METADATA_LENGTH} characters or less`,
        })
        .nullable()
        .optional(),
    preview: z
        .string({ message: 'Preview must be a string' })
        .trim()
        .max(MAX_METADATA_LENGTH, {
            message: `Preview must be ${MAX_METADATA_LENGTH} characters or less`,
        })
        .nullable()
        .optional(),
    is_active: z.boolean({ message: 'Active must be a boolean' }).optional(),
    values: templateValuesSchema.default({}),
});

export const templateValuesInputSchema = z.object({
    values: templateValuesSchema,
});

export function validateTemplate(body: unknown): TemplateData {
    const parsed = templateInputSchema.safeParse(body);
    if (!parsed.success) {
        throw new ValidationException(
            'Invalid template payload',
            z.flattenError(parsed.error).fieldErrors
        );
    }
    return parsed.data;
}

export function validateTemplateValues(body: unknown): TemplateValuesData {
    const parsed = templateValuesInputSchema.safeParse(body);
    if (!parsed.success) {
        throw new ValidationException(
            'Invalid template payload',
            z.flattenError(parsed.error).fieldErrors
        );
    }
    return parsed.data;
}
