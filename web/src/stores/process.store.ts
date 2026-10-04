import { create } from "zustand";
import { processService } from "@/api/services/process.service";
import { toApiError, toUnreachableError } from "@/lib/error-code";
import { useDashboardStore } from "@/stores/dashboard.store";
import type { ApiError, ApiResponse } from "@/types/api";
import type { LoadStatus } from "@/types/dashboard";
import type { ProcessSummary, StartIssue, StartProcessPayload } from "@/types/process";
import type { RegisteredServer } from "@/types/server";
import type { ProcessTemplate, TemplateKey } from "@/types/template";

/** Fields the page always renders, regardless of the selected template. */
export const FIXED_FIELD_KEYS = ["name", "namespace", "cwd", "interpreter"] as const;

const REQUIRED_FIXED_FIELDS: readonly string[] = ["name", "interpreter"];

export function isFixedField(field: TemplateKey): boolean {
    return (FIXED_FIELD_KEYS as readonly string[]).includes(field.property_key);
}

function blankField(): TemplateKey {
    return {
        property_key: "",
        property_value: "",
        data_type: "string",
        is_required: false,
        is_hidden: false,
    };
}

function fixedField(propertyKey: string): TemplateKey {
    return {
        property_key: propertyKey,
        property_value: null,
        data_type: "string",
        is_required: REQUIRED_FIXED_FIELDS.includes(propertyKey),
        is_hidden: false,
    };
}

// Adds the fixed rows without disturbing rows a template already defines for
// them, so template flags (required) win for matching keys.
function ensureFixedFields(fields: TemplateKey[]): TemplateKey[] {
    const present = new Set(fields.map((field) => field.property_key));
    const missing = FIXED_FIELD_KEYS.filter((key) => !present.has(key)).map(fixedField);
    return [...fields, ...missing];
}

function fieldsForTemplate(template: ProcessTemplate | "none"): TemplateKey[] {
    if (template === "none") return ensureFixedFields([blankField()]);
    // Clone so editing a value never mutates the cached template.
    return ensureFixedFields(template.keys.map((key) => ({ ...key })));
}

export type TemplateChoice = ProcessTemplate | "none";

interface ProcessState {
    step: 1 | 2;
    server: RegisteredServer | null;
    template: TemplateChoice;
    fields: TemplateKey[];
    status: LoadStatus;
    requestError: ApiError | null;
    issues: StartIssue[];
    started: ProcessSummary[] | null;
    goToStep: (step: 1 | 2) => void;
    selectServer: (server: RegisteredServer | null) => void;
    selectTemplate: (template: TemplateChoice) => void;
    setValue: (propertyKey: string, value: string) => void;
    addField: () => void;
    updateField: (index: number, patch: Partial<TemplateKey>) => void;
    removeField: (index: number) => void;
    submit: (payload: StartProcessPayload) => Promise<ApiResponse<ProcessSummary[] | StartIssue[]>>;
    reset: () => void;
}

export const useProcessStore = create<ProcessState>()((set, get) => ({
    step: 1,
    server: null,
    template: "none",
    fields: fieldsForTemplate("none"),
    status: "idle",
    requestError: null,
    issues: [],
    started: null,

    goToStep: (step) => set({ step }),

    selectServer: (server) => set({ server }),

    selectTemplate: (template) =>
        set({
            template,
            fields: fieldsForTemplate(template),
            status: "idle",
            requestError: null,
            issues: [],
            started: null,
        }),

    setValue: (propertyKey, value) =>
        set((state) => ({
            fields: state.fields.map((field) =>
                field.property_key === propertyKey ? { ...field, property_value: value } : field
            ),
        })),

    addField: () => set((state) => ({ fields: [...state.fields, blankField()] })),

    updateField: (index, patch) =>
        set((state) => ({
            fields: state.fields.map((field, fieldIndex) =>
                fieldIndex === index ? { ...field, ...patch } : field
            ),
        })),

    removeField: (index) =>
        set((state) => ({ fields: state.fields.filter((_, fieldIndex) => fieldIndex !== index) })),

    // Submits a payload the page already validated and built. On success the
    // process list of the target server is re-synced so the dashboard reflects
    // the new process immediately.
    submit: async (payload) => {
        const { server } = get();
        if (!server) {
            return {
                success: false,
                message: "Select a server before registering a process.",
                info: null,
                status: 0,
            };
        }

        set({ status: "loading", requestError: null, issues: [], started: null });

        let result: ApiResponse<ProcessSummary[] | StartIssue[]>;
        try {
            result = await processService(server).start(payload);
        } catch (cause) {
            const requestError = toUnreachableError(cause);
            set({ status: "error", requestError, issues: [], started: null });
            return { success: false, message: requestError.message, info: null, status: 0 };
        }

        if (!result.success) {
            const issues =
                result.code === "INVALID_PROCESS_CONFIGURATION" && Array.isArray(result.info)
                    ? (result.info as StartIssue[])
                    : [];
            set({ status: "error", requestError: toApiError(result), issues, started: null });
            return result;
        }

        const started = Array.isArray(result.info) ? (result.info as ProcessSummary[]) : [];
        set({ status: "success", requestError: null, issues: [], started });
        void useDashboardStore.getState().refreshServer(server);
        return result;
    },

    // Restores the selected template's defaults, keeping the server and template
    // choices so another process can be registered right away.
    reset: () =>
        set((state) => ({
            fields: fieldsForTemplate(state.template),
            status: "idle",
            requestError: null,
            issues: [],
            started: null,
        })),
}));
