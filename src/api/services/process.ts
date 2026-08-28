import { httpRequest } from "@/api/config";
import { ENDPOINTS, buildEndpointUrl } from "@/api/endpoint";
import type { ProcessLogs, ServerListResponse } from "@/types";

export type LogStreamType = "both" | "output" | "error";

export async function fetchRegisteredProcesses(baseUrl: string) {
    const response = await httpRequest<ServerListResponse>({
        url: `${buildEndpointUrl(baseUrl, ENDPOINTS.list)}?logs=5&overview=true`,
        method: "GET",
    });

    return response
}

export async function fetchProcessLogs(
    baseUrl: string,
    processId: number,
    tail: number,
    type: LogStreamType = "both",
) {
    const params = new URLSearchParams({ tail: String(tail), type });
    const response = await httpRequest<ProcessLogs>({
        url: `${buildEndpointUrl(baseUrl, ENDPOINTS.logs(processId))}?${params}`,
        method: "GET",
    });

    return response
}
