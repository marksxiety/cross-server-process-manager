/**
 * Single source of truth for the PM2 fields the register form and the template
 * editor understand. One typed array drives both: the two cards the UI renders
 * (basic and advanced), the advanced sub-groups separated by rules, the value
 * control used for each field, and the payload coercion.
 *
 * Language-agnostic on purpose: nothing here mentions a specific runtime. Every
 * placeholder is neutral; stack-specific starting points come only from
 * templates, and templates are guides (initial values), never field states.
 */

export type FieldType = "string" | "number" | "boolean" | "array" | "object" | "duration";

export type FieldGroup = "basic" | "advanced";

export type AdvancedGroupId =
    | "restart"
    | "schedule"
    | "resources"
    | "watch"
    | "overrides"
    | "scaling";

export interface ProcessFieldSpec {
    key: string;
    label: string;
    group: FieldGroup;
    advancedGroup?: AdvancedGroupId;
    type: FieldType;
    required?: boolean;
    /** Free-text suggestions for a combobox (e.g. "none"). */
    options?: readonly string[];
    /** Render a select instead of a free-text input; requires `options`. */
    select?: boolean;
    /** Render a combobox (free text + suggestions); requires `options`. */
    combobox?: boolean;
    /** Placeholder text, always language-agnostic. */
    placeholder?: string;
    /** Display/value transform applied by the form and payload builder. */
    format?: "uppercase";
    /** Short muted hint shown under the control. */
    hint?: string;
    /** Shown as the control's resting state when the field is empty; never sent. */
    defaultValue?: string | number | boolean;
    /** Enables the field only when another field holds one of these values. */
    enabledWhen?: { key: string; oneOf: readonly (string | number | boolean)[] };
}

export const ADVANCED_GROUPS: readonly { id: AdvancedGroupId; label: string }[] = [
    { id: "restart", label: "Restart policy" },
    { id: "schedule", label: "Schedule" },
    { id: "resources", label: "Resources & shutdown" },
    { id: "watch", label: "Watch" },
    { id: "overrides", label: "Overrides" },
    { id: "scaling", label: "Scaling" },
];
export const PROCESS_FIELDS: readonly ProcessFieldSpec[] = [
    {
        key: "name",
        label: "Process Name",
        group: "basic",
        type: "string",
        required: true,
        placeholder: "my-app",
        hint: "Lowercase recommended, e.g. data-sync. Use dashes instead of spaces.",
    },
    {
        key: "namespace",
        label: "Group (Namespace)",
        group: "basic",
        type: "string",
        placeholder: "DEFAULT",
        format: "uppercase",
    },
    {
        key: "cwd",
        label: "Working Directory (Project Folder)",
        group: "basic",
        type: "string",
        required: true,
        placeholder: "C:/apps/my-service",
    },
    {
        key: "interpreter",
        label: "Interpreter (Runtime)",
        group: "basic",
        type: "string",
        required: true,
        options: ["none"],
        combobox: true,
        placeholder: "C:/path/to/interpreter or none",
        hint: 'Use "none" to run the script directly with no interpreter.',
    },
    {
        key: "script",
        label: "Script File",
        group: "basic",
        type: "string",
        required: true,
        placeholder: "app.py",
    },
    {
        key: "args",
        label: "Script Arguments",
        group: "basic",
        type: "array",
        placeholder: "value",
        hint: "One argument per row, in the exact order the script expects. Press Enter to add, click an argument to edit it.",
    },
    {
        key: "env",
        label: "Environment Variables",
        group: "basic",
        type: "object",
    },

    // Advanced — group 1: restart policy
    {
        key: "autorestart",
        label: "Auto Restart",
        group: "advanced",
        advancedGroup: "restart",
        type: "boolean",
        defaultValue: true,
    },
    {
        key: "max_restarts",
        label: "Max Restart Attempts",
        group: "advanced",
        advancedGroup: "restart",
        type: "number",
        placeholder: "16",
        hint: "Maximum number of unstable restarts. Once reached, the process will no longer be restarted.",
        enabledWhen: { key: "autorestart", oneOf: [true] },
    },
    {
        key: "min_uptime",
        label: "Minimum Uptime (Counts as Stable)",
        group: "advanced",
        advancedGroup: "restart",
        type: "duration",
        placeholder: "10s",
        enabledWhen: { key: "autorestart", oneOf: [true] },
    },
    {
        key: "restart_delay",
        label: "Delay Between Restarts",
        group: "advanced",
        advancedGroup: "restart",
        type: "duration",
        placeholder: "4000",
        enabledWhen: { key: "autorestart", oneOf: [true] },
    },

    // Advanced — group 2: schedule
    {
        key: "cron_restart",
        label: "Scheduled Restart (Cron)",
        group: "advanced",
        advancedGroup: "schedule",
        type: "string",
        placeholder: "*/5 * * * *",
        hint: "With autorestart off, this runs the process as a scheduled job.",
        enabledWhen: { key: "autorestart", oneOf: [false] },
    },

    // Advanced — group 3: resources & shutdown
    {
        key: "max_memory_restart",
        label: "Restart When Memory Exceeds",
        group: "advanced",
        advancedGroup: "resources",
        type: "string",
        placeholder: "500M",
    },
    {
        key: "kill_timeout",
        label: "Force Stop Timeout",
        group: "advanced",
        advancedGroup: "resources",
        type: "duration",
        placeholder: "1600",
    },

    // Advanced — group 4: watch
    {
        key: "watch",
        label: "Restart on File Changes",
        group: "advanced",
        advancedGroup: "watch",
        type: "boolean",
        defaultValue: false,
    },
    {
        key: "ignore_watch",
        label: "Ignored Files / Folders",
        group: "advanced",
        advancedGroup: "watch",
        type: "array",
        placeholder: "value",
        enabledWhen: { key: "watch", oneOf: [true] },
        hint: "Available when watch is on.",
    },
    {
        key: "watch_delay",
        label: "Wait Before Restarting",
        group: "advanced",
        advancedGroup: "watch",
        type: "duration",
        placeholder: "1000",
        enabledWhen: { key: "watch", oneOf: [true] },
        hint: "Available when watch is on.",
    },

    // Advanced — group 5: overrides
    {
        key: "interpreter_args",
        label: "Interpreter Arguments",
        group: "advanced",
        advancedGroup: "overrides",
        type: "array",
        placeholder: "value",
        hint: "One argument per row, in the exact order the interpreter expects. Press Enter to add, click an argument to edit it.",
    },
    {
        key: "windowsHide",
        label: "Hide Console Window",
        group: "advanced",
        advancedGroup: "overrides",
        type: "boolean",
        defaultValue: true,
    },

    // Advanced — group 6: scaling
    {
        key: "exec_mode",
        label: "Execution Mode",
        group: "advanced",
        advancedGroup: "scaling",
        type: "string",
        options: ["fork", "cluster"],
        select: true,
        defaultValue: "fork",
    },
    {
        key: "instances",
        label: "Number of Instances",
        group: "advanced",
        advancedGroup: "scaling",
        type: "number",
        placeholder: "1",
        enabledWhen: { key: "exec_mode", oneOf: ["cluster"] },
        hint: "Available when execution mode is cluster.",
    },
];
const FIELD_BY_KEY = new Map(PROCESS_FIELDS.map((field) => [field.key, field]));

export const ALLOWED_FIELD_KEYS: ReadonlySet<string> = new Set(FIELD_BY_KEY.keys());

export const REQUIRED_FIELD_KEYS: readonly string[] = PROCESS_FIELDS.filter(
    (field) => field.required,
).map((field) => field.key);

export function catalogField(key: string): ProcessFieldSpec | undefined {
    return FIELD_BY_KEY.get(key);
}

export function isCatalogField(key: string): boolean {
    return FIELD_BY_KEY.has(key);
}

export function basicFields(): ProcessFieldSpec[] {
    return PROCESS_FIELDS.filter((field) => field.group === "basic");
}

export function advancedFields(): ProcessFieldSpec[] {
    return PROCESS_FIELDS.filter((field) => field.group === "advanced");
}

/** Fields for an advanced sub-group, in catalog order. */
export function advancedGroupFields(group: AdvancedGroupId): ProcessFieldSpec[] {
    return PROCESS_FIELDS.filter(
        (field) => field.group === "advanced" && field.advancedGroup === group,
    );
}

/** A field outside the catalog (possible only via direct API writes). */
export function isValueEmpty(value: unknown): boolean {
    if (value === undefined || value === null) return true;
    if (typeof value === "string") return value.trim() === "";
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === "object") return Object.keys(value as object).length === 0;
    return false;
}

/**
 * A field is enabled unless it declares a dependency on another field's value.
 * An unset dependency falls back to that field's resting default, matching what
 * its control shows, so conditions hold before the user touches anything.
 * Dependencies only dim; the field always stays visible.
 */
export function isFieldEnabled(
    spec: ProcessFieldSpec,
    values: Record<string, unknown>,
): boolean {
    if (!spec.enabledWhen) return true;
    const { key, oneOf } = spec.enabledWhen;
    const raw = values[key];
    const current = raw === undefined ? catalogField(key)?.defaultValue : raw;
    return oneOf.some((allowed) => allowed === current);
}

/**
 * Drops values for fields whose enabling condition is not met. Disabled fields
 * must never carry data: a value left behind by a template or a since-changed
 * dependency would otherwise be displayed, submitted, and re-saved. Iterates
 * until stable because dropping one field's value can disable another.
 * Unknown keys are preserved.
 */
export function clearDisabledValues(values: Record<string, unknown>): Record<string, unknown> {
    let current = values;
    for (;;) {
        const next: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(current)) {
            const spec = catalogField(key);
            if (spec && !isFieldEnabled(spec, current)) continue;
            next[key] = value;
        }
        if (Object.keys(next).length === Object.keys(current).length) return next;
        current = next;
    }
}

const DURATION_PATTERN = /^(\d+(?:\.\d+)?)(ms|s|m|h)?$/i;

/** True when a duration is a finite millisecond number or a `10s`-style string. */
export function isValidDuration(value: unknown): boolean {
    if (typeof value === "number") return Number.isFinite(value) && value >= 0;
    if (typeof value === "string") return DURATION_PATTERN.test(value.trim());
    return false;
}

/**
 * Client-side mirror of the agent's required-field and type checks. Only used
 * when registering a process; templates have no required-field rules.
 */
export function validateRegisterValues(values: Record<string, unknown>): Record<string, string> {
    const errors: Record<string, string> = {};

    for (const spec of PROCESS_FIELDS) {
        if (!isFieldEnabled(spec, values)) continue;

        const value = values[spec.key];

        if (spec.required && isValueEmpty(value)) {
            errors[spec.key] = "This field is required";
            continue;
        }

        if (isValueEmpty(value)) continue;

        switch (spec.type) {
            case "number": {
                if (spec.key === "instances" && value === "max") break;
                const numeric = typeof value === "number" ? value : Number(value);
                if (!Number.isFinite(numeric)) {
                    errors[spec.key] = "Must be a number";
                } else if (spec.key === "instances" && (!Number.isInteger(numeric) || numeric < 1)) {
                    errors[spec.key] = 'Must be a positive integer or "max"';
                }
                break;
            }
            case "duration": {
                if (!isValidDuration(value)) {
                    errors[spec.key] = "Must be a number of milliseconds or a duration like 10s";
                }
                break;
            }
            case "array": {
                if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
                    errors[spec.key] = "Must be a list of strings";
                }
                break;
            }
            case "object": {
                if (typeof value !== "object" || value === null || Array.isArray(value)) {
                    errors[spec.key] = "Must be a key/value object";
                } else if (Object.values(value).some((entry) => typeof entry !== "string")) {
                    errors[spec.key] = "Every value must be a string";
                }
                break;
            }
            default:
                break;
        }
    }

    return errors;
}
