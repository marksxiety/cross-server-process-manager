import { createConnection } from "@/api/connection";
import type { RegisteredServer } from "@/types/server";
import type { ProcessSummary } from "@/types/process";
import type { SystemOverview } from "@/types/system";

export function processService(server: RegisteredServer) {
    const api = createConnection(server);

    return {
        list: () => api.get<ProcessSummary[]>("/pm2/list"),
        overview: () => api.get<{ overview: SystemOverview; processes: ProcessSummary[] }>("/pm2/list?overview=true"),
        start: (pmId: number) => api.post<ProcessSummary[]>(`/pm2/start/${pmId}`),
        stop: (pmId: number) => api.post<ProcessSummary[]>(`/pm2/stop/${pmId}`),
        restart: (pmId: number) => api.post<ProcessSummary[]>(`/pm2/restart/${pmId}`),
        reload: (pmId: number) => api.post<ProcessSummary[]>(`/pm2/reload/${pmId}`),
    };
}