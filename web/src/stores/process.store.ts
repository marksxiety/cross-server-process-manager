import { create } from "zustand";
import { processService } from "@/api/services/process.service";
import { toApiError, toUnreachableError } from "@/lib/error-code";
import { useDashboardStore } from "@/stores/dashboard.store";
import type { ApiError, ApiResponse } from "@/types/api";
import type { LoadStatus } from "@/types/dashboard";
import type { ProcessSummary, StartIssue, StartProcessPayload } from "@/types/process";
import type { RegisteredServer } from "@/types/server";
import type { ProcessTemplate, TemplateValues } from "@/types/template";

export type TemplateChoice = ProcessTemplate | "none";

function templateValues(template: TemplateChoice): TemplateValues {
    return template === "none" ? {} : { ...template.values };
}

/**
 * Applies a template's values as starting points without discarding fields the
 * user already edited by hand: a key the user touched keeps its value, every
 * other key is replaced by the template's (or cleared when choosing "none").
 */
function applyTemplate(
    template: TemplateChoice,
    current: TemplateValues,
    dirtyKeys: Set<string>,
): TemplateValues {
    const next: TemplateValues = {};

    for (const key of dirtyKeys) {
        if (current[key] !== undefined) next[key] = current[key];
    }

    for (const [key, value] of Object.entries(templateValues(template))) {
        if (dirtyKeys.has(key)) continue;
        next[key] = value;
    }

    return next;
}

interface ProcessState {
    step: 1 | 2;
    server: RegisteredServer | null;
    template: TemplateChoice;
    values: TemplateValues;
    /** Keys the user edited by hand; protected from template prefill. */
    dirtyKeys: Set<string>;
    status: LoadStatus;
    requestError: ApiError | null;
    issues: StartIssue[];
    started: ProcessSummary[] | null;
    goToStep: (step: 1 | 2) => void;
    selectServer: (server: RegisteredServer | null) => void;
    selectTemplate: (template: TemplateChoice) => void;
    setValue: (key: string, value: unknown) => void;
    submit: (payload: StartProcessPayload) => Promise<ApiResponse<ProcessSummary[] | StartIssue[]>>;
    reset: () => void;
}

export const useProcessStore = create<ProcessState>()((set, get) => ({
    step: 1,
    server: null,
    template: "none",
    values: {},
    dirtyKeys: new Set<string>(),
    status: "idle",
    requestError: null,
    issues: [],
    started: null,

    goToStep: (step) => set({ step }),

    selectServer: (server) => set({ server }),

    selectTemplate: (template) =>
        set((state) => ({
            template,
            values: applyTemplate(template, state.values, state.dirtyKeys),
            status: "idle",
            requestError: null,
            issues: [],
            started: null,
        })),

    setValue: (key, value) =>
        set((state) => {
            const values = { ...state.values };
            if (value === undefined) delete values[key];
            else values[key] = value;

            const dirtyKeys = new Set(state.dirtyKeys);
            dirtyKeys.add(key);

            return { values, dirtyKeys };
        }),

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

    // Restores the selected template's values, keeping the server and template
    // choices so another process can be registered right away.
    reset: () =>
        set((state) => ({
            values: templateValues(state.template),
            dirtyKeys: new Set<string>(),
            status: "idle",
            requestError: null,
            issues: [],
            started: null,
        })),
}));
