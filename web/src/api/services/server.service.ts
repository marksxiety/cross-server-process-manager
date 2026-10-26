import { registryConnection } from "@/api/registry";
import type { RegisteredServer, ServerInput } from "@/types/server";
import type { ApiResponse } from "@/types/api";

export function serverService() {
    const api = registryConnection();

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
        register: (payload: ServerInput) => api.post<RegisteredServer>("/register", payload),
        update: (id: number, payload: ServerInput) =>
            api.put<RegisteredServer>(`/servers/${id}`, payload),
        remove: (id: number) => api.del<RegisteredServer>(`/servers/${id}`),
    };
}