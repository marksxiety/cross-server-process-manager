import { z } from 'zod';

const MAX_PROPERTY_KEY_LENGTH = 100;

export const templateKeyInputSchema = z.object({
    property_key: z
        .string({ message: 'Key is required' })
        .trim()
        .min(1, { message: 'Key is required' })
        .max(MAX_PROPERTY_KEY_LENGTH, {
            message: `Key must be ${MAX_PROPERTY_KEY_LENGTH} characters or less`,
        }),
    property_value: z.string({ message: 'Value must be a string' }).nullable(),
    data_type: z.enum(['string', 'boolean', 'number', 'array', 'object'], {
        message: 'Data type must be string, boolean, number, array or object',
    }),
    is_required: z.boolean({ message: 'Required must be a boolean' }),
    is_hidden: z.boolean({ message: 'Hidden must be a boolean' }),
    is_locked: z.boolean({ message: 'Locked must be a boolean' }),
});

// Natural key within a template: duplicate keys would silently collapse into one
// upsert, so reject them up front with a field-level error.
export const templateKeysInputSchema = z.object({
    keys: z
        .array(templateKeyInputSchema, { message: 'Keys must be an array' })
        .superRefine((keys, ctx) => {
            const seen = new Set<string>();
            for (const [index, key] of keys.entries()) {
                if (seen.has(key.property_key)) {
                    ctx.addIssue({
                        code: 'custom',
                        path: [index, 'property_key'],
                        message: `Duplicate key "${key.property_key}"`,
                    });
                }
                seen.add(key.property_key);
            }
        }),
});

const MAX_TEMPLATE_NAME_LENGTH = 100;
const MAX_METADATA_LENGTH = 255;

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
    keys: templateKeysInputSchema.shape.keys,
});

export type TemplateKeyInput = z.infer<typeof templateKeyInputSchema>;
export type TemplateKeysInput = z.infer<typeof templateKeysInputSchema>;
export type TemplateInput = z.infer<typeof templateInputSchema>;
