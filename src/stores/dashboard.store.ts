import { create } from "zustand";
import { fetchRegisteredServers } from "@/api/services/registry.service";
import { processService } from "@/api/services/process.service";
import type { ApiResponse } from "@/types/api";
import type { ProcessSummary } from "@/types/process";
import type { RegisteredServer } from "@/types/server";

type LoadStatus = "idle" | "loading" | "success" | "error";

export interface ServerProcesses {
    status: LoadStatus;
    processes: ProcessSummary[];
    error: string | null;
}

interface DashboardState {
    serversStatus: LoadStatus;
    servers: RegisteredServer[];
    serversError: string | null;
    processesByServer: Record<string, ServerProcesses>;
    load: () => Promise<void>;
}

function toServerProcesses(result: PromiseSettledResult<ApiResponse<ProcessSummary[]>>): ServerProcesses {
    if (result.status === "rejected") {
        const cause = result.reason as Error;
        return { status: "error", processes: [], error: cause.message };
    }

    if (!result.value.success) {
        return { status: "error", processes: [], error: result.value.message };
    }

    return { status: "success", processes: result.value.info ?? [], error: null };
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
    serversStatus: "idle",
    servers: [],
    serversError: null,
    processesByServer: {},

    load: async () => {
        if (get().serversStatus === "loading") return;

        set({ serversStatus: "loading", serversError: null });
        const registryRes = await fetchRegisteredServers();

        if (!registryRes.success || !registryRes.info) {
            set({ serversStatus: "error", serversError: registryRes.message, servers: [], processesByServer: {} });
            return;
        }

        const servers = registryRes.info;
        set({
            serversStatus: "success",
            servers,
            processesByServer: Object.fromEntries(
                servers.map((server) => [server.server, { status: "loading" as const, processes: [], error: null }])
            ),
        });

        const results = await Promise.allSettled(servers.map((server) => processService(server).list()));
        set({
            processesByServer: Object.fromEntries(
                servers.map((server, index) => [server.server, toServerProcesses(results[index])])
            ),
        });
    },
}));
