import { create } from "zustand";
import { processService } from "@/api/services/process.service";
import { toApiError, toUnreachableError } from "@/lib/error-code";
import { buildCatalogFields, mergeCatalogFields } from "@/lib/process-fields";
import { useDashboardStore } from "@/stores/dashboard.store";
import type { ApiError, ApiResponse } from "@/types/api";
import type { LoadStatus } from "@/types/dashboard";
import type { ProcessSummary, StartIssue, StartProcessPayload } from "@/types/process";
import type { RegisteredServer } from "@/types/server";
import type { ProcessTemplate, TemplateKey } from "@/types/template";

function fieldsForTemplate(template: ProcessTemplate | "none"): TemplateKey[] {
    // None pre-fills the xpm defaults; a template contributes its own values and
    // leaves every catalog key it does not define blank.
    if (template === "none") return buildCatalogFields();
    return mergeCatalogFields(template.keys);
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
