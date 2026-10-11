import { z } from "zod";

/** A sparse map of PM2 option keys to values. */
export const templateValuesSchema = z.record(z.string(), z.unknown());

export const processTemplateSchema = z.object({
    id: z.number(),
    template_name: z.string(),
    category: z.string().nullable(),
    description: z.string().nullable(),
    preview: z.string().nullable(),
    is_active: z.boolean(),
    values: templateValuesSchema,
});

// Persisted slice — these keys drive `partialize` and the rehydration merge.
export const templatePersistSchema = z.object({
    templates: z.array(processTemplateSchema),
    templatesFetchedAt: z.number().nullable(),
});
