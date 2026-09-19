import { create } from "zustand";
import { serverService } from "@/api/services/server.service";
import type { LoadStatus } from "@/types/dashboard";
import type { RegisteredServer } from "@/types/server";

interface ServerState {
    servers: RegisteredServer[];
    status: LoadStatus;
    error: string | null;
    load: () => Promise<void>;
    reload: () => Promise<void>;
}

export const useServerStore = create<ServerState>()((set) => {
    // Guards the fetch against concurrent runs (mount effect + React StrictMode).
    let isFetchInFlight = false;

    // Fetches the full registry (active + inactive) and stores it. Used by load
    // and reload.
    async function fetchRegistry(): Promise<void> {
        const result = await serverService().list(true);
        const servers = result.info;

        if (!result.success || !servers) {
            set({ status: "error", error: result.message });
            return;
        }

        set({ status: "success", error: null, servers });
    }

    return {
        servers: [],
        status: "idle",
        error: null,

        // Entry action called by Server.tsx on mount.
        load: async () => {
            if (isFetchInFlight) return;

            isFetchInFlight = true;
            set({ status: "loading", error: null });
            try {
                await fetchRegistry();
            } finally {
                isFetchInFlight = false;
            }
        },

        // Re-fetches the registry. Available for a manual refresh.
        reload: async () => {
            if (isFetchInFlight) return;

            isFetchInFlight = true;
            set({ status: "loading", error: null });
            try {
                await fetchRegistry();
            } finally {
                isFetchInFlight = false;
            }
        },
    };
});
