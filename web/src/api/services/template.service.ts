import { createConnection } from "@/api/connection";
import type { ProcessTemplate, TemplateInput, TemplateKey } from "@/types/template";
import type { ApiResponse } from "@/types/api";

export function templateService() {
    const api = createConnection({
        protocol: import.meta.env.VITE_PROTOCOL as "http" | "https",
        host: import.meta.env.VITE_HOST,
        port: Number(import.meta.env.VITE_PORT),
    });

    return {
        list: async (withInactive = false): Promise<ApiResponse<ProcessTemplate[]>> => {
            try {
                const result = await api.get<ProcessTemplate[]>(
                    withInactive ? "/templates?with_inactive=true" : "/templates"
                );
                return { ...result, info: Array.isArray(result.info) ? result.info : [] };
            } catch (cause) {
                return { success: false, message: (cause as Error).message, info: [], status: 0 };
            }
        },
        create: async (payload: TemplateInput): Promise<ApiResponse<ProcessTemplate>> => {
            try {
                return await api.post<ProcessTemplate>("/templates", payload);
            } catch (cause) {
                return { success: false, message: (cause as Error).message, info: null, status: 0 };
            }
        },
        update: async (id: number, keys: TemplateKey[]): Promise<ApiResponse<ProcessTemplate>> => {
            try {
                return await api.put<ProcessTemplate>(`/templates/${id}`, { keys });
            } catch (cause) {
                return { success: false, message: (cause as Error).message, info: null, status: 0 };
            }
        },
        remove: async (id: number): Promise<ApiResponse<ProcessTemplate>> => {
            try {
                return await api.del<ProcessTemplate>(`/templates/${id}`);
            } catch (cause) {
                return { success: false, message: (cause as Error).message, info: null, status: 0 };
            }
        },
    };
}
