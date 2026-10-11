import { z } from 'zod';

const MAX_PROPERTY_KEY_LENGTH = 100;
const MAX_TEMPLATE_NAME_LENGTH = 100;
const MAX_METADATA_LENGTH = 255;

/**
 * Sparse map of PM2 option keys to initial values. Templates are guides: an
 * absent key is simply left empty in the form, and there are no required,
 * hidden or locked states.
 */
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

export const templateValuesInputSchema = z.object({
    values: templateValuesSchema,
});

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

export type TemplateValuesInput = z.infer<typeof templateValuesInputSchema>;
export type TemplateInput = z.infer<typeof templateInputSchema>;
