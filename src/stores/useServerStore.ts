import { create } from "zustand";
import { fetchServerList } from "@/api/services/server";
import { fetchRegisteredProcesses } from "@/api/services/process";
import type { ProcessInfo, SystemOverview } from "@/types";

export type ServerStatus = "online" | "offline" | "warning" | "critical";

export const WARNING_THRESHOLD = 95;
export const CRITICAL_THRESHOLD = 99;

export interface ServerState {
    id: string;
    name: string;
    ip_address: string;
    url: string;
    host?: SystemOverview;
    data: ProcessInfo[];
    status: ServerStatus;
    isLoading: boolean;
}

function getCpuPercent(cpu: SystemOverview["cpu"]): number {
    return (cpu.loadAvg[0] / cpu.cores) * 100;
}

function getServerStatus(
    overview: SystemOverview,
): Exclude<ServerStatus, "offline"> {
    const highest = Math.max(
        overview.memory.percentUsed,
        getCpuPercent(overview.cpu),
    );
    if (highest >= CRITICAL_THRESHOLD) return "critical";
    if (highest >= WARNING_THRESHOLD) return "warning";
    return "online";
}

interface ServerStore {
    servers: ServerState[];
    isLoading: boolean;
    fetchRegisteredServers: () => Promise<void>;
}

export const useServerStore = create<ServerStore>((set, get) => ({
    servers: [],
    isLoading: true,

    fetchRegisteredServers: async () => {
        const list = await fetchServerList();
        if (!list.success || !list.info) {
            set({ servers: [], isLoading: false });
            return;
        }

        const initial = list.info.map((entry) => ({
            ...entry,
            host: undefined,
            data: [] as ProcessInfo[],
            status: "offline" as ServerStatus,
            isLoading: true,
        }));

        set({ servers: initial });

        await Promise.all(
            initial.map(async (server) => {
                try {
                    const res = await fetchRegisteredProcesses(server.url);
                    const info = res.info;
                    if (res.success && info) {
                        set((state) => ({
                            servers: state.servers.map((s) =>
                                s.id === server.id
                                    ? {
                                        ...s,
                                        host: info.overview,
                                        data: info.processes ?? [],
                                        status: getServerStatus(info.overview),
                                        isLoading: false,
                                    }
                                    : s,
                            ),
                        }));
                    } else {
                        set((state) => ({
                            servers: state.servers.map((s) =>
                                s.id === server.id
                                    ? { ...s, status: "offline", isLoading: false }
                                    : s,
                            ),
                        }));
                    }
                } catch {
                    set((state) => ({
                        servers: state.servers.map((s) =>
                            s.id === server.id
                                ? { ...s, status: "offline", isLoading: false }
                                : s,
                        ),
                    }));
                }
            }),
        );

        set({ isLoading: false });
    },
}));