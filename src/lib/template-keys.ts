import type { TemplateKey } from "@/types/template";

/**
 * A row is only dropped when it carries neither a key nor a value: untouched
 * placeholder rows. Rows with a key but no value are valid (the value column is
 * nullable); rows with a value but no key cannot be persisted and are rejected
 * by the server's validation.
 */
export function isBlankKey(key: TemplateKey): boolean {
    const hasKey = key.property_key.trim() !== "";
    const hasValue = key.property_value !== null && key.property_value.trim() !== "";
    return !hasKey && !hasValue;
}

/** Filters the editor's rows down to the ones that should be sent for saving. */
export function toSavableKeys(keys: TemplateKey[]): TemplateKey[] {
    return keys.filter((key) => !isBlankKey(key));
}
