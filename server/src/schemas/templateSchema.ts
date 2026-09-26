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

export type TemplateKeyInput = z.infer<typeof templateKeyInputSchema>;
export type TemplateKeysInput = z.infer<typeof templateKeysInputSchema>;
