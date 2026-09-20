import { createConnection } from "@/api/connection";
import type { RegisteredServer, RegisterServer } from "@/types/server";
import type { ApiResponse } from "@/types/api";

export function serverService() {
    const api = createConnection({
        protocol: import.meta.env.VITE_PROTOCOL as "http" | "https",
        host: import.meta.env.VITE_HOST,
        port: Number(import.meta.env.VITE_PORT),
    });

    return {

        list: async (withInactive = false): Promise<ApiResponse<RegisteredServer[]>> => {
            try {
                const result = await api.get<RegisteredServer[]>(
                    withInactive ? "/servers?with_inactive=true" : "/servers"
                );
                return { ...result, info: Array.isArray(result.info) ? result.info : [] };
            } catch (cause) {
                return { success: false, message: (cause as Error).message, info: [], status: 0 };
            }
        },
        register: (payload: RegisterServer) => api.post<RegisteredServer>("/register", payload),
    };
}