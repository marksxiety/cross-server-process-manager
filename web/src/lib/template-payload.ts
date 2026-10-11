import { isValueEmpty, PROCESS_FIELDS } from "@/lib/process-fields";
import type { TemplateValues } from "@/types/template";

/**
 * Assembles a sparse PM2 `/start`-shaped payload from template/form values by
 * coercing each value according to the master field list. Language-agnostic: it
 * only knows the generic value types, never a specific runtime.
 *
 * Only fields that carry a value are included — defaults and untouched fields
 * are never sent, and the agent applies its own defaults. Durations are passed
 * through as-is (number or "10s" string); the agent normalizes them.
 */
export function buildTemplatePayload(values: TemplateValues): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    for (const spec of PROCESS_FIELDS) {
        const raw = values[spec.key];
        if (isValueEmpty(raw)) continue;

        switch (spec.type) {
            case "number": {
                if (spec.key === "instances" && raw === "max") {
                    payload[spec.key] = "max";
                    break;
                }
                const value = typeof raw === "number" ? raw : Number(raw);
                if (Number.isFinite(value)) payload[spec.key] = value;
                break;
            }
            case "boolean":
                payload[spec.key] = raw === true || raw === "true";
                break;
            case "duration":
                payload[spec.key] = typeof raw === "number" ? raw : String(raw).trim();
                break;
            case "array":
                payload[spec.key] = Array.isArray(raw) ? raw : [raw];
                break;
            case "object":
                payload[spec.key] = raw;
                break;
            default:
                payload[spec.key] = typeof raw === "string" ? raw : String(raw);
        }
    }

    return payload;
}
