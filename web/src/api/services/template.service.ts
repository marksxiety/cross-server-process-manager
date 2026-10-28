import { registryConnection } from "@/api/registry";
import type { ProcessTemplate, TemplateInput, TemplateValues } from "@/types/template";
import type { ApiResponse } from "@/types/api";

export function templateService() {
    const api = registryConnection();

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
        update: async (id: number, values: TemplateValues): Promise<ApiResponse<ProcessTemplate>> => {
            try {
                return await api.put<ProcessTemplate>(`/templates/${id}`, { values });
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
