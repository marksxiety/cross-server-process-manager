import { create } from "zustand";
import { persist } from "zustand/middleware";
import { templateService } from "@/api/services/template.service";
import { toApiError } from "@/lib/error-code";
import { isCacheFresh } from "@/lib/swr";
import { persistedStore } from "@/lib/persisted";
import { templatePersistSchema } from "@/schemas/template.schema";
import type { ApiError } from "@/types/api";
import type { LoadStatus } from "@/types/dashboard";
import type { ProcessTemplate } from "@/types/template";

interface TemplateState {
    templates: ProcessTemplate[];
    templatesFetchedAt: number | null;
    status: LoadStatus;
    requestError: ApiError | null;
    isRefreshing: boolean;
    load: () => Promise<void>;
    reload: () => Promise<void>;
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
            };
        },
        persistedStore<TemplateState, typeof templatePersistSchema>({
            name: "template-registry-cache",
            schema: templatePersistSchema,
        })
    )
);
