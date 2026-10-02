import { create } from "zustand";
import { persist } from "zustand/middleware";
import { templateService } from "@/api/services/template.service";
import { toApiError } from "@/lib/error-code";
import { isCacheFresh } from "@/lib/swr";
import { persistedStore } from "@/lib/persisted";
import { templatePersistSchema } from "@/schemas/template.schema";
import type { ApiError, ApiResponse } from "@/types/api";
import type { LoadStatus } from "@/types/dashboard";
import type { ProcessTemplate, TemplateInput, TemplateKey } from "@/types/template";

interface TemplateState {
    templates: ProcessTemplate[];
    templatesFetchedAt: number | null;
    status: LoadStatus;
    requestError: ApiError | null;
    isRefreshing: boolean;
    load: () => Promise<void>;
    reload: () => Promise<void>;
    register: (payload: TemplateInput) => Promise<ApiResponse<ProcessTemplate>>;
    save: (templateId: number, keys: TemplateKey[]) => Promise<ApiResponse<ProcessTemplate>>;
    remove: (templateId: number) => Promise<ApiResponse<ProcessTemplate>>;
}

export const useTemplateStore = create<TemplateState>()(
    persist(
        (set, get) => {
            // Guards fetches against concurrent runs (mount effect + React StrictMode).
            let isFetchInFlight = false;

            // Fetches the full registry (active + inactive), stamps the fetch time
            // that drives the SWR freshness check, and stores it.
            async function fetchTemplates(): Promise<void> {
                const result = await templateService().list(true);
                const templates = result.info;

                if (!result.success || !templates) {
                    set({ status: "error", requestError: toApiError(result) });
                    return;
                }

                set({ status: "success", requestError: null, templates, templatesFetchedAt: Date.now() });
            }

            return {
                templates: [],
                templatesFetchedAt: null,
                status: "idle",
                requestError: null,
                isRefreshing: false,

                // Entry action called by Template.tsx on mount. Renders the cached
                // registry immediately and only refetches when the cache is stale.
                load: async () => {
                    if (isFetchInFlight) return;

                    const { templates, templatesFetchedAt } = get();

                    if (templates.length === 0) {
                        isFetchInFlight = true;
                        set({ status: "loading", requestError: null });
                        try {
                            await fetchTemplates();
                        } finally {
                            isFetchInFlight = false;
                        }
                        return;
                    }

                    set({ status: "success", requestError: null });
                    if (isCacheFresh(templatesFetchedAt)) return;

                    isFetchInFlight = true;
                    set({ isRefreshing: true });
                    try {
                        await fetchTemplates();
                    } finally {
                        isFetchInFlight = false;
                        set({ isRefreshing: false });
                    }
                },

                // Re-fetches the registry, keeping the current list visible. Available
                // for a manual refresh.
                reload: async () => {
                    if (isFetchInFlight) return;

                    isFetchInFlight = true;
                    set((state) => ({
                        status: state.templates.length === 0 ? "loading" : "success",
                        requestError: null,
                        isRefreshing: true,
                    }));
                    try {
                        await fetchTemplates();
                    } finally {
                        isFetchInFlight = false;
                        set({ isRefreshing: false });
                    }
                },

                // Registers a new template and appends the server's canonical
                // copy to the cached list. Returns the envelope for caller
                // feedback.
                register: async (payload) => {
                    const result = await templateService().create(payload);

                    const created = result.info;
                    if (result.success && created) {
                        set((state) => ({ templates: [...state.templates, created] }));
                    }

                    return result;
                },

                // Persists an edited template's keys and swaps the server's
                // canonical copy into the cached list. Returns the envelope so
                // the caller can surface success/failure feedback.
                save: async (templateId, keys) => {
                    const result = await templateService().update(templateId, keys);

                    const saved = result.info;
                    if (result.success && saved) {
                        set((state) => ({
                            templates: state.templates.map((template) =>
                                template.id === saved.id ? saved : template
                            ),
                        }));
                    }

                    return result;
                },

                // Deletes a template (the server cascades its keys) and drops it
                // from the cached list. Returns the envelope for caller feedback.
                remove: async (templateId) => {
                    const result = await templateService().remove(templateId);

                    if (result.success) {
                        set((state) => ({
                            templates: state.templates.filter(
                                (template) => template.id !== templateId
                            ),
                        }));
                    }

                    return result;
                },
            };
        },
        persistedStore<TemplateState, typeof templatePersistSchema>({
            name: "template-registry-cache",
            schema: templatePersistSchema,
        })
    )
);
