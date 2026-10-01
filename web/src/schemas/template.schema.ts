import { z } from "zod";

export const templateKeySchema = z.object({
    property_key: z.string(),
    property_value: z.string().nullable(),
    data_type: z.enum(["string", "boolean", "number", "array", "object"]),
    is_required: z.boolean(),
    is_hidden: z.boolean(),
    is_locked: z.boolean(),
});

export const processTemplateSchema = z.object({
    id: z.number(),
    template_name: z.string(),
    category: z.string().nullable(),
    description: z.string().nullable(),
    preview: z.string().nullable(),
    is_active: z.boolean(),
    keys: z.array(templateKeySchema),
});

// Persisted slice — these keys drive `partialize` and the rehydration merge.
export const templatePersistSchema = z.object({
    templates: z.array(processTemplateSchema),
    templatesFetchedAt: z.number().nullable(),
});
