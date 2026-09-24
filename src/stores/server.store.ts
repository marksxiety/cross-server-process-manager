import { create } from "zustand";
import { persist } from "zustand/middleware";
import { serverService } from "@/api/services/server.service";
import { isCacheFresh } from "@/lib/swr";
import { persistedStore } from "@/lib/persisted";
import { serverPersistSchema } from "@/schemas/server.schema";
import type { LoadStatus } from "@/types/dashboard";
import type { RegisteredServer } from "@/types/server";

interface ServerState {
    servers: RegisteredServer[];
    serversFetchedAt: number | null;
    status: LoadStatus;
    error: string | null;
    isRefreshing: boolean;
    load: () => Promise<void>;
    reload: () => Promise<void>;
}

export const useServerStore = create<ServerState>()(
    persist(
        (set, get) => {
            // Guards fetches against concurrent runs (mount effect + React StrictMode).
            let isFetchInFlight = false;

            // Fetches the full registry (active + inactive), stamps the fetch time
            // that drives the SWR freshness check, and stores it.
            async function fetchRegistry(): Promise<void> {
                const result = await serverService().list(true);
                const servers = result.info;

                if (!result.success || !servers) {
                    set({ status: "error", error: result.message });
                    return;
                }

                set({ status: "success", error: null, servers, serversFetchedAt: Date.now() });
            }

            return {
                servers: [],
                serversFetchedAt: null,
                status: "idle",
                error: null,
                isRefreshing: false,

                // Entry action called by Server.tsx on mount. Renders the cached
                // registry immediately and only refetches when the cache is stale.
                load: async () => {
                    if (isFetchInFlight) return;

                    const { servers, serversFetchedAt } = get();

                    if (servers.length === 0) {
                        isFetchInFlight = true;
                        set({ status: "loading", error: null });
                        try {
                            await fetchRegistry();
                        } finally {
                            isFetchInFlight = false;
                        }
                        return;
                    }

                    set({ status: "success", error: null });
                    if (isCacheFresh(serversFetchedAt)) return;

                    isFetchInFlight = true;
                    set({ isRefreshing: true });
                    try {
                        await fetchRegistry();
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
                        status: state.servers.length === 0 ? "loading" : "success",
                        error: null,
                        isRefreshing: true,
                    }));
                    try {
                        await fetchRegistry();
                    } finally {
                        isFetchInFlight = false;
                        set({ isRefreshing: false });
                    }
                },
            };
        },
        persistedStore<ServerState, typeof serverPersistSchema>({
            name: "server-registry-cache",
            schema: serverPersistSchema,
        })
    )
);
