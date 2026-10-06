import { createConnection } from "@/api/connection";
import { normalizeProcessDescribe } from "@/lib/process-describe";
import type { ApiResponse } from "@/types/api";
import type { RegisteredServer } from "@/types/server";
import type { LogStreamType, ProcessDescribe, ProcessLogs, ProcessSummary, StartIssue, StartProcessPayload } from "@/types/process";
import type { SystemOverview } from "@/types/system";

export function processService(server: RegisteredServer) {
    const api = createConnection(server);

    return {
        list: () => api.get<ProcessSummary[]>("/pm2/list"),
        overview: () => api.get<{ overview: SystemOverview; processes: ProcessSummary[] }>("/pm2/list?overview=true"),
        describe: async (pmId: number): Promise<ApiResponse<ProcessDescribe>> => {
            const response = await api.get<unknown>(`/pm2/describe/${pmId}`);
            if (!response.success || response.info === null || response.info === undefined) {
                return response as ApiResponse<ProcessDescribe>;
            }
            const info = normalizeProcessDescribe(response.info);
            if (info === null) {
                return {
                    ...response,
                    success: false,
                    message: "Unrecognized response from the agent — it may be running an outdated version.",
                    info: null,
                };
            }
            return { ...response, info };
        },
        logs: (pmId: number, params: { tail?: number; type?: LogStreamType } = {}) => {
            const search = new URLSearchParams();
            if (params.tail !== undefined) search.set("tail", String(params.tail));
            if (params.type !== undefined) search.set("type", params.type);
            const query = search.toString();
            return api.get<ProcessLogs>(`/pm2/logs/${pmId}${query ? `?${query}` : ""}`);
        },
        start: (payload: StartProcessPayload) =>
            api.post<ProcessSummary[] | StartIssue[]>("/pm2/start", payload),
        stop: (pmId: number) => api.post<ProcessSummary[]>(`/pm2/stop/${pmId}`),
        restart: (pmId: number) => api.post<ProcessSummary[]>(`/pm2/restart/${pmId}`),
        reload: (pmId: number) => api.post<ProcessSummary[]>(`/pm2/reload/${pmId}`),
        remove: (pmId: number) => api.del<ProcessSummary[]>(`/pm2/delete/${pmId}`),
    };
}