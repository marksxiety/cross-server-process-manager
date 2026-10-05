import type { TemplateDataType, TemplateKey } from "@/types/template";

/**
 * Single source of truth for the PM2 fields the register form and the template
 * editor understand. Fields are grouped into the two cards the UI renders:
 * everyday settings (basic) and stability/scaling/recovery settings (advanced,
 * pre-filled with xpm defaults).
 *
 * The agent accepts exactly these keys on POST /pm2/start; anything else is
 * silently stripped before it reaches PM2.
 */

export type FieldGroup = "basic" | "advanced";

export interface ProcessFieldSpec {
    key: string;
    group: FieldGroup;
    dataType: TemplateDataType;
    isRequired: boolean;
    /** Pre-filled for the "None" template; null means the field starts empty. */
    defaultValue: string | null;
    /** When set, the form renders a select instead of a free-text input. */
    options?: readonly string[];
    placeholder?: string;
}

export const PROCESS_FIELDS: readonly ProcessFieldSpec[] = [
    {
        key: "name",
        group: "basic",
        dataType: "string",
        isRequired: true,
        defaultValue: null,
        placeholder: "my-app",
    },
    {
        key: "namespace",
        group: "basic",
        dataType: "string",
        isRequired: false,
        defaultValue: "default",
    },
    {
        key: "cwd",
        group: "basic",
        dataType: "string",
        isRequired: true,
        defaultValue: null,
        placeholder: "C:/apps/my-service",
    },
    {
        key: "interpreter",
        group: "basic",
        dataType: "string",
        isRequired: true,
        defaultValue: null,
        placeholder: "C:/Program Files/nodejs/node.exe or none",
    },
    {
        key: "script",
        group: "basic",
        dataType: "string",
        isRequired: true,
        defaultValue: null,
        placeholder: "index.js",
    },
    {
        key: "args",
        group: "basic",
        dataType: "array",
        isRequired: false,
        defaultValue: null,
        placeholder: '["--port", "3000"]',
    },
    {
        key: "interpreter_args",
        group: "basic",
        dataType: "array",
        isRequired: false,
        defaultValue: null,
        placeholder: '["--env-file=.env"]',
    },
    {
        key: "exec_mode",
        group: "basic",
        dataType: "string",
        isRequired: false,
        defaultValue: "fork",
        options: ["fork", "cluster"],
    },
    {
        key: "instances",
        group: "basic",
        dataType: "number",
        isRequired: false,
        defaultValue: "1",
        placeholder: "1 or max",
    },
    {
        key: "env",
        group: "basic",
        dataType: "object",
        isRequired: false,
        defaultValue: null,
        placeholder: '{ "NODE_ENV": "production" }',
    },
    {
        key: "autorestart",
        group: "advanced",
        dataType: "boolean",
        isRequired: false,
        defaultValue: "true",
    },
    {
        key: "max_restarts",
        group: "advanced",
        dataType: "number",
        isRequired: false,
        defaultValue: "15",
    },
    {
        key: "min_uptime",
        group: "advanced",
        dataType: "string",
        isRequired: false,
        defaultValue: "10s",
        placeholder: "10s",
    },
    {
        key: "restart_delay",
        group: "advanced",
        dataType: "number",
        isRequired: false,
        defaultValue: "4000",
    },
    {
        key: "max_memory_restart",
        group: "advanced",
        dataType: "string",
        isRequired: false,
        defaultValue: null,
        placeholder: "500M",
    },
    {
        key: "increment_var",
        group: "advanced",
        dataType: "string",
        isRequired: false,
        defaultValue: null,
        placeholder: "PORT",
    },
    {
        key: "cron_restart",
        group: "advanced",
        dataType: "string",
        isRequired: false,
        defaultValue: null,
        placeholder: "0 0 * * *",
    },
    {
        key: "kill_timeout",
        group: "advanced",
        dataType: "number",
        isRequired: false,
        defaultValue: "5000",
    },
    {
        key: "windowsHide",
        group: "advanced",
        dataType: "boolean",
        isRequired: false,
        defaultValue: null,
    },
    {
        key: "watch",
        group: "advanced",
        dataType: "boolean",
        isRequired: false,
        defaultValue: null,
    },
    {
        key: "ignore_watch",
        group: "advanced",
        dataType: "array",
        isRequired: false,
        defaultValue: null,
        placeholder: '["node_modules", "logs"]',
    },
    {
        key: "watch_delay",
        group: "advanced",
        dataType: "number",
        isRequired: false,
        defaultValue: null,
    },
];

const FIELD_BY_KEY = new Map(PROCESS_FIELDS.map((field) => [field.key, field]));

const FIELD_ORDER = new Map(PROCESS_FIELDS.map((field, index) => [field.key, index]));

export const ALLOWED_FIELD_KEYS: ReadonlySet<string> = new Set(FIELD_BY_KEY.keys());

export const REQUIRED_FIELD_KEYS: readonly string[] = PROCESS_FIELDS.filter(
    (field) => field.isRequired,
).map((field) => field.key);

export function catalogField(key: string): ProcessFieldSpec | undefined {
    return FIELD_BY_KEY.get(key);
}

export function isCatalogField(key: string): boolean {
    return FIELD_BY_KEY.has(key);
}

export function catalogFields(group: FieldGroup): ProcessFieldSpec[] {
    return PROCESS_FIELDS.filter((field) => field.group === group);
}

export function toTemplateKey(spec: ProcessFieldSpec): TemplateKey {
    return {
        property_key: spec.key,
        property_value: spec.defaultValue,
        data_type: spec.dataType,
        is_required: spec.isRequired,
        is_hidden: false,
    };
}

/** Full catalog with xpm defaults; used when the "None" template is selected. */
export function buildCatalogFields(): TemplateKey[] {
    return PROCESS_FIELDS.map(toTemplateKey);
}

/**
 * Splits template keys into the two cards. Keys outside the catalog (possible
 * only through direct API writes) fall back to advanced so they stay visible
 * and editable rather than silently disappearing. Rows are shown in catalog
 * order so base fields always lead their card, whatever order a template stores.
 */
export function groupTemplateKeys(fields: TemplateKey[]): {
    basic: TemplateKey[];
    advanced: TemplateKey[];
} {
    const basic: TemplateKey[] = [];
    const advanced: TemplateKey[] = [];

    for (const field of fields) {
        const group = catalogField(field.property_key)?.group ?? "advanced";
        (group === "basic" ? basic : advanced).push(field);
    }

    const byCatalogOrder = (a: TemplateKey, b: TemplateKey) =>
        (FIELD_ORDER.get(a.property_key) ?? Number.MAX_SAFE_INTEGER) -
        (FIELD_ORDER.get(b.property_key) ?? Number.MAX_SAFE_INTEGER);
    basic.sort(byCatalogOrder);
    advanced.sort(byCatalogOrder);

    return { basic, advanced };
}

/**
 * Client-side mirror of the agent's schema + configuration guide, limited to
 * what a form can catch before the request is sent.
 */
export function validateFields(fields: TemplateKey[]): Record<string, string> {
    const errors: Record<string, string> = {};
    const seen = new Set<string>();

    for (const field of fields) {
        const key = field.property_key.trim();
        if (key === "") continue;

        if (seen.has(key)) {
            errors[key] = `Duplicate field "${key}"`;
            continue;
        }
        seen.add(key);

        const value = (field.property_value ?? "").trim();
        const isRequired = field.is_required || REQUIRED_FIELD_KEYS.includes(key);
        if (isRequired && value === "") {
            errors[key] = "This field is required";
            continue;
        }
        if (value === "") continue;

        if (field.data_type === "number") {
            if (key === "instances" && value === "max") continue;
            const numeric = Number(value);
            if (!Number.isFinite(numeric)) {
                errors[key] = "Must be a number";
            } else if (key === "instances" && (!Number.isInteger(numeric) || numeric < 1)) {
                errors[key] = 'Must be a positive integer or "max"';
            }
            continue;
        }

        if (field.data_type === "array" || field.data_type === "object") {
            let parsed: unknown;
            try {
                parsed = JSON.parse(value);
            } catch {
                errors[key] = "Must be valid JSON";
                continue;
            }

            if (field.data_type === "array" && !Array.isArray(parsed)) {
                errors[key] = "Must be a JSON array";
            }

            if (field.data_type === "object") {
                if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
                    errors[key] = "Must be a JSON object";
                } else if (
                    key === "env" &&
                    Object.values(parsed).some((entry) => typeof entry !== "string")
                ) {
                    errors[key] = "Every env value must be a string";
                }
            }
        }
    }

    for (const key of REQUIRED_FIELD_KEYS) {
        if (!seen.has(key) && errors[key] === undefined) {
            errors[key] = "This field is required";
        }
    }

    return errors;
}
