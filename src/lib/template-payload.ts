import type { TemplateKey } from "@/types/template";

/**
 * Assembles a PM2 `/start`-shaped payload from template keys by coercing each
 * value according to its `data_type`. Language-agnostic: it only knows the
 * generic value types, never a specific runtime.
 *
 * Rows with an empty key or an empty/null value are skipped, mirroring the
 * "drop unset fields" behavior of the register form.
 */
export function buildTemplatePayload(keys: TemplateKey[]): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    for (const key of keys) {
        if (key.property_key.trim() === "") continue;

        const raw = key.property_value;
        if (raw === null || raw.trim() === "") continue;

        switch (key.data_type) {
            case "number": {
                const value = Number(raw);
                if (!Number.isNaN(value)) payload[key.property_key] = value;
                break;
            }
            case "boolean":
                payload[key.property_key] = raw.trim() === "true";
                break;
            case "array":
            case "object": {
                try {
                    payload[key.property_key] = JSON.parse(raw);
                } catch {
                    payload[key.property_key] = raw;
                }
                break;
            }
            default:
                payload[key.property_key] = raw;
        }
    }

    return payload;
}
