import { create } from "zustand";
import { persist } from "zustand/middleware";
import { serverService } from "@/api/services/server.service";
import { isCacheFresh } from "@/lib/swr";
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

// Type guard that rejects malformed entries coming from localStorage. Used by
// the persist merge so corrupt caches fall through to a real fetch.
function isRegisteredServer(value: unknown): value is RegisteredServer {
    if (typeof value !== "object" || value === null) return false;

    const candidate = value as Partial<RegisteredServer>;
    return (
        typeof candidate.id === "number" &&
        typeof candidate.server === "string" &&
        (candidate.protocol === "http" || candidate.protocol === "https") &&
        typeof candidate.host === "string" &&
        typeof candidate.port === "number" &&
        typeof candidate.is_active === "boolean"
    );
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
        {
            name: "server-registry-cache",
            // Only the registry and its fetch timestamp are cached.
            partialize: (state) => ({
                servers: state.servers,
                serversFetchedAt: state.serversFetchedAt,
            }),
            // Sanitizes the persisted slice after hydration so corrupt data can never
            // put a non-array or malformed rows into servers.
            merge: (persistedState, currentState) => {
                const persisted = persistedState as Partial<ServerState> | null;
                return {
                    ...currentState,
                    servers: Array.isArray(persisted?.servers)
                        ? persisted.servers.filter(isRegisteredServer)
                        : [],
                    serversFetchedAt:
                        typeof persisted?.serversFetchedAt === "number" ? persisted.serversFetchedAt : null,
                };
            },
            // Reports hydration failures (corrupt JSON, storage unavailable).
            onRehydrateStorage: () => (_state, error) => {
                if (error) {
                    console.warn("server-store: could not restore cached servers", error);
                }
            },
        }
    )
);
