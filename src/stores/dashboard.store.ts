import { create } from "zustand";
import { persist } from "zustand/middleware";
import { fetchRegisteredServers } from "@/api/services/registry.service";
import { processService } from "@/api/services/process.service";
import {
    UNKNOWN_ERROR_CODE,
    UNREACHABLE_ERROR_CODE,
} from "@/lib/error-code";
import { isCacheFresh } from "@/lib/swr";
import { toSystemOverview } from "@/lib/system-overview";
import type { ApiResponse } from "@/types/api";
import type { LoadStatus, ServerProcesses } from "@/types/dashboard";
import type { ProcessSummary } from "@/types/process";
import type { RegisteredServer } from "@/types/server";
import type { SystemOverview } from "@/types/system";

interface DashboardState {
    servers: RegisteredServer[];
    serversFetchedAt: number | null;
    serversStatus: LoadStatus;
    serversError: string | null;
    processesByServer: Record<string, ServerProcesses>;
    isRefreshing: boolean;
    load: () => Promise<void>;
    refresh: () => Promise<void>;
    reload: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>()(
    persist(
        (set, get) => {
            type OverviewResult = ApiResponse<{ overview: SystemOverview; processes: ProcessSummary[] }>;

            // Guards load() against concurrent runs (mount effect + React StrictMode).
            let isLoadInFlight = false;

            // Type guard that rejects malformed server entries coming from localStorage.
            // Used by runLoad to decide whether the persisted cache can be trusted.
            function isRegisteredServer(value: unknown): value is RegisteredServer {
                if (typeof value !== "object" || value === null) return false;

                const candidate = value as Partial<RegisteredServer>;
                return (
                    typeof candidate.server === "string" &&
                    (candidate.protocol === "http" || candidate.protocol === "https") &&
                    typeof candidate.host === "string" &&
                    typeof candidate.port === "number"
                );
            }

            // Placeholder entry shown while a server's overview request is in flight.
            // Used by createLoadingEntries and reconcileEntries.
            function loadingEntry(): ServerProcesses {
                return { status: "loading", processes: [], overview: null, error: null };
            }

            // Builds a loading entry per cached server so the UI can render cached servers
            // immediately. Used by runLoad on the cache-hit path.
            function createLoadingEntries(servers: RegisteredServer[]): Record<string, ServerProcesses> {
                return Object.fromEntries(servers.map((server) => [server.server, loadingEntry()]));
            }

            // Keeps already-fetched entries for still-registered servers and adds loading
            // entries for newly registered ones. Used by fetchAndStoreRegistry.
            function reconcileEntries(
                entries: Record<string, ServerProcesses>,
                servers: RegisteredServer[]
            ): Record<string, ServerProcesses> {
                return Object.fromEntries(servers.map((server) => [server.server, entries[server.server] ?? loadingEntry()]));
            }

            // Maps one settled overview request into a success or error ServerProcesses entry.
            // Used by syncProcesses for each server.
            function toServerProcesses(result: PromiseSettledResult<OverviewResult>): ServerProcesses {
                if (result.status === "rejected") {
                    const cause = result.reason as Error;
                    return {
                        status: "error",
                        processes: [],
                        overview: null,
                        error: { code: UNREACHABLE_ERROR_CODE, message: cause.message, status: 0 },
                    };
                }

                if (!result.value.success || !result.value.info) {
                    return {
                        status: "error",
                        processes: [],
                        overview: null,
                        error: {
                            code: result.value.code ?? UNKNOWN_ERROR_CODE,
                            message: result.value.message,
                            status: result.value.status,
                        },
                    };
                }

                return {
                    status: "success",
                    processes: Array.isArray(result.value.info.processes) ? result.value.info.processes : [],
                    overview: toSystemOverview(result.value.info.overview),
                    error: null,
                };
            }

            // Wraps a request promise as a settled result so one failing server does not
            // reject the whole batch. Used by syncProcesses.
            function settle(promise: Promise<OverviewResult>): Promise<PromiseSettledResult<OverviewResult>> {
                return promise.then(
                    (value) => ({ status: "fulfilled", value }),
                    (reason: unknown) => ({ status: "rejected", reason })
                );
            }

            // Requests overview + processes from every registered server and writes each
            // result into processesByServer. Used by load, refresh and reload.
            async function syncProcesses(servers: RegisteredServer[]): Promise<void> {
                await Promise.all(
                    servers.map(async (server) => {
                        const entry = await settle(processService(server).overview());
                        set((state) => ({
                            processesByServer: { ...state.processesByServer, [server.server]: toServerProcesses(entry) },
                        }));
                    })
                );
            }

            // Fetches the registered servers and stores them with serversFetchedAt, which
            // drives the SWR freshness check. Used by runLoad and reload.
            async function fetchAndStoreRegistry(): Promise<string | null> {
                const result = await fetchRegisteredServers();
                const servers = result.info;

                if (!result.success || !servers) return result.message;

                set((state) => ({
                    servers,
                    serversFetchedAt: Date.now(),
                    serversError: null,
                    processesByServer: reconcileEntries(state.processesByServer, servers),
                }));
                return null;
            }

            // Orchestrates the initial load: renders a valid cache immediately, refetches the
            // registry when the cache is stale or invalid, then syncs processes. Used by load.
            async function runLoad(): Promise<void> {
                const { servers, serversFetchedAt } = get();
                const hasValidCache =
                    serversFetchedAt !== null && servers.length > 0 && servers.every(isRegisteredServer);

                if (!hasValidCache) {
                    set({ serversStatus: "loading", serversError: null, servers: [], processesByServer: {} });
                    const error = await fetchAndStoreRegistry();

                    if (error !== null) {
                        set({ serversStatus: "error", serversError: error });
                        return;
                    }

                    set({ serversStatus: "success" });
                    await syncProcesses(get().servers);
                    return;
                }

                set({
                    serversStatus: "success",
                    serversError: null,
                    processesByServer: createLoadingEntries(servers),
                });

                if (!isCacheFresh(serversFetchedAt)) {
                    set({ isRefreshing: true });
                    const error = await fetchAndStoreRegistry();
                    set({ isRefreshing: false, serversError: error });
                }

                await syncProcesses(get().servers);
            }

            return {
                servers: [],
                serversFetchedAt: null,
                serversStatus: "idle",
                serversError: null,
                processesByServer: {},
                isRefreshing: false,

                // Entry action called by Dashboard.tsx on mount; runs runLoad once.
                load: async () => {
                    if (isLoadInFlight) return;

                    isLoadInFlight = true;
                    try {
                        await runLoad();
                    } finally {
                        isLoadInFlight = false;
                    }
                },

                // Re-syncs processes without touching the registry. Called by Dashboard.tsx
                // on the auto-refresh interval.
                refresh: async () => {
                    if (get().isRefreshing || get().servers.length === 0) return;

                    set({ isRefreshing: true });
                    try {
                        await syncProcesses(get().servers);
                    } finally {
                        set({ isRefreshing: false });
                    }
                },

                // Re-fetches the registry and then processes. Called by Dashboard.tsx's
                // refresh button.
                reload: async () => {
                    if (get().isRefreshing || isLoadInFlight) return;

                    set({ isRefreshing: true });
                    try {
                        const error = await fetchAndStoreRegistry();

                        if (error !== null) {
                            set((state) => ({
                                serversStatus: state.servers.length === 0 ? "error" : state.serversStatus,
                                serversError: error,
                            }));
                            return;
                        }

                        set({ serversStatus: "success", serversError: null });
                        await syncProcesses(get().servers);
                    } finally {
                        set({ isRefreshing: false });
                    }
                },
            };
        },
        {
            name: "servers-cache",
            // Only the server list and its fetch timestamp are cached; process data is volatile.
            partialize: (state) => ({
                servers: state.servers,
                serversFetchedAt: state.serversFetchedAt,
            }),
            // Sanitizes the persisted slice after hydration so corrupt data can never put
            // a non-array into servers; invalid caches fall through to runLoad's refetch.
            merge: (persistedState, currentState) => {
                const persisted = persistedState as Partial<DashboardState> | null;
                return {
                    ...currentState,
                    servers: Array.isArray(persisted?.servers) ? persisted.servers : [],
                    serversFetchedAt:
                        typeof persisted?.serversFetchedAt === "number" ? persisted.serversFetchedAt : null,
                };
            },
            // Reports hydration failures (corrupt JSON, storage unavailable).
            onRehydrateStorage: () => (_state, error) => {
                if (error) {
                    console.warn("dashboard-store: could not restore cached servers", error);
                }
            },
        }
    )
);
