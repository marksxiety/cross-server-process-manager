import { create } from "zustand";
import { persist } from "zustand/middleware";
import { serverService } from "@/api/services/server.service";
import { processService } from "@/api/services/process.service";
import { PROCESS_STATE_CONFLICT_CODE, toApiError, toUnreachableError } from "@/lib/error-code";
import { canRunProcessCommand } from "@/lib/process-runtime";
import { withRetry } from "@/lib/retry";
import { isCacheFresh } from "@/lib/swr";
import { toSystemOverview } from "@/lib/system-overview";
import type { ApiError, ApiResponse } from "@/types/api";
import type { LoadStatus, ServerProcesses } from "@/types/dashboard";
import type { ProcessCommand, ProcessCommandTarget, ProcessSummary } from "@/types/process";
import type { RegisteredServer } from "@/types/server";
import type { SystemOverview } from "@/types/system";

type CommandPendingKey =
    | "isStarting"
    | "isStopping"
    | "isRestarting"
    | "isReloading"
    | "isDeleting";

interface DashboardState {
    servers: RegisteredServer[];
    serversFetchedAt: number | null;
    serversStatus: LoadStatus;
    requestError: ApiError | null;
    processesByServer: Record<string, ServerProcesses>;
    isRefreshing: boolean;
    isStarting: boolean;
    isStopping: boolean;
    isRestarting: boolean;
    isReloading: boolean;
    isDeleting: boolean;
    load: () => Promise<void>;
    refresh: () => Promise<void>;
    refreshServer: (server: RegisteredServer) => Promise<void>;
    reload: () => Promise<void>;
    startProcess: (server: RegisteredServer, process: ProcessCommandTarget) => Promise<ApiResponse<ProcessSummary[]>>;
    stopProcess: (server: RegisteredServer, process: ProcessCommandTarget) => Promise<ApiResponse<ProcessSummary[]>>;
    restartProcess: (server: RegisteredServer, process: ProcessCommandTarget) => Promise<ApiResponse<ProcessSummary[]>>;
    reloadProcess: (server: RegisteredServer, process: ProcessCommandTarget) => Promise<ApiResponse<ProcessSummary[]>>;
    deleteProcess: (server: RegisteredServer, process: ProcessCommandTarget) => Promise<ApiResponse<ProcessSummary[]>>;
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
                    typeof candidate.id === "number" &&
                    typeof candidate.server === "string" &&
                    (candidate.protocol === "http" || candidate.protocol === "https") &&
                    typeof candidate.host === "string" &&
                    typeof candidate.port === "number" &&
                    typeof candidate.is_active === "boolean"
                );
            }

            // Placeholder entry shown while a server's overview request is in flight.
            // Used by createLoadingEntries and reconcileEntries.
            function loadingEntry(): ServerProcesses {
                return { status: "loading", processes: [], overview: null, requestError: null };
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
                    return {
                        status: "error",
                        processes: [],
                        overview: null,
                        requestError: toUnreachableError(result.reason),
                    };
                }

                if (!result.value.success || !result.value.info) {
                    return {
                        status: "error",
                        processes: [],
                        overview: null,
                        requestError: toApiError(result.value),
                    };
                }

                return {
                    status: "success",
                    processes: Array.isArray(result.value.info.processes) ? result.value.info.processes : [],
                    overview: toSystemOverview(result.value.info.overview),
                    requestError: null,
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
                        const entry = await settle(
                            withRetry(() => processService(server).overview())
                        );
                        set((state) => ({
                            processesByServer: { ...state.processesByServer, [server.server]: toServerProcesses(entry) },
                        }));
                    })
                );
            }

            // Fetches the registered servers and stores them with serversFetchedAt, which
            // drives the SWR freshness check. Used by runLoad and reload.
            async function fetchAndStoreRegistry(): Promise<ApiError | null> {
                const result = await serverService().list();
                const servers = result.info;

                if (!result.success || !servers) return toApiError(result);

                set((state) => ({
                    servers,
                    serversFetchedAt: Date.now(),
                    requestError: null,
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
                    set({ serversStatus: "loading", requestError: null, servers: [], processesByServer: {} });
                    const error = await fetchAndStoreRegistry();

                    if (error !== null) {
                        set({ serversStatus: "error", requestError: error });
                        return;
                    }

                    set({ serversStatus: "success" });
                    await syncProcesses(get().servers);
                    return;
                }

                set({
                    serversStatus: "success",
                    requestError: null,
                    processesByServer: createLoadingEntries(servers),
                });

                if (!isCacheFresh(serversFetchedAt)) {
                    set({ isRefreshing: true });
                    const error = await fetchAndStoreRegistry();
                    set({ isRefreshing: false, requestError: error });
                }

                await syncProcesses(get().servers);
            }

            // Synthesizes the shared envelope for a command the store refuses to run.
            function commandConflict(message: string): ApiResponse<ProcessSummary[]> {
                return {
                    success: false,
                    message,
                    code: PROCESS_STATE_CONFLICT_CODE,
                    info: null,
                    status: 0,
                };
            }

            // True while any lifecycle command is in flight; used to reject overlapping
            // commands before they reach the agent.
            function isAnyCommandPending(state: DashboardState): boolean {
                return (
                    state.isStarting ||
                    state.isStopping ||
                    state.isRestarting ||
                    state.isReloading ||
                    state.isDeleting
                );
            }

            // Shared lifecycle-command runner. Guards against overlapping commands and
            // against commands the process's current state does not allow, then refreshes
            // the server's processes on success. Used by every command action.
            async function runCommand(
                command: ProcessCommand,
                pendingKey: CommandPendingKey,
                server: RegisteredServer,
                process: ProcessCommandTarget,
                call: () => Promise<ApiResponse<ProcessSummary[]>>,
            ): Promise<ApiResponse<ProcessSummary[]>> {
                if (isAnyCommandPending(get())) {
                    return commandConflict("Another action is already in progress.");
                }

                // Prefer the freshest cached summary; the caller's snapshot is the
                // fallback while a server's processes are loading or errored.
                const cached = get().processesByServer[server.server]?.processes.find(
                    (entry) => entry.pm_id === process.pm_id,
                );
                if (!canRunProcessCommand(cached ?? process, command)) {
                    return commandConflict("Action is not available for the process's current state.");
                }

                set({ [pendingKey]: true } as Pick<DashboardState, CommandPendingKey>);

                try {
                    const result = await call();
                    if (result.success) await get().refreshServer(server);
                    return result;
                } catch (cause) {
                    const requestError = toUnreachableError(cause);
                    return {
                        success: false,
                        message: requestError.message,
                        code: requestError.code,
                        info: null,
                        status: requestError.status,
                    };
                } finally {
                    set({ [pendingKey]: false } as Pick<DashboardState, CommandPendingKey>);
                }
            }

            return {
                servers: [],
                serversFetchedAt: null,
                serversStatus: "idle",
                requestError: null,
                processesByServer: {},
                isRefreshing: false,
                isStarting: false,
                isStopping: false,
                isRestarting: false,
                isReloading: false,
                isDeleting: false,

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

                // Re-syncs a single server's processes. Called after a process is
                // registered on that server so the dashboard reflects it immediately.
                refreshServer: async (server) => {
                    const entry = await settle(
                        withRetry(() => processService(server).overview())
                    );
                    set((state) => ({
                        processesByServer: {
                            ...state.processesByServer,
                            [server.server]: toServerProcesses(entry),
                        },
                    }));
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
                                requestError: error,
                            }));
                            return;
                        }

                        set({ serversStatus: "success", requestError: null });
                        await syncProcesses(get().servers);
                    } finally {
                        set({ isRefreshing: false });
                    }
                },

                // Lifecycle commands. Each sets its own pending flag (read by the
                // dashboard to disable/spin the matching button) and is guarded by
                // runCommand before any request reaches the agent.
                startProcess: (server, process) =>
                    runCommand("start", "isStarting", server, process, () =>
                        processService(server).restart(process.pm_id),
                    ),

                stopProcess: (server, process) =>
                    runCommand("stop", "isStopping", server, process, () =>
                        processService(server).stop(process.pm_id),
                    ),

                restartProcess: (server, process) =>
                    runCommand("restart", "isRestarting", server, process, () =>
                        processService(server).restart(process.pm_id),
                    ),

                reloadProcess: (server, process) =>
                    runCommand("reload", "isReloading", server, process, () =>
                        processService(server).reload(process.pm_id),
                    ),

                deleteProcess: (server, process) =>
                    runCommand("delete", "isDeleting", server, process, () =>
                        processService(server).remove(process.pm_id),
                    ),
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
