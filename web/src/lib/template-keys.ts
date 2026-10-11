import { isCatalogField, isValueEmpty } from "@/lib/process-fields";
import type { TemplateValues } from "@/types/template";

/**
 * Template values are a sparse guide: only fields that actually carry a value
 * are persisted, and unknown keys are dropped so a template can only ever seed
 * real PM2 options. Untouched fields stay empty and are simply not stored.
 */
export function toSavableValues(values: TemplateValues): TemplateValues {
    const out: TemplateValues = {};

    for (const [key, value] of Object.entries(values)) {
        if (!isCatalogField(key)) continue;
        if (isValueEmpty(value)) continue;
        out[key] = value;
    }

    return out;
}
