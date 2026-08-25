import { httpRequest } from "@/api/config";
import { ENDPOINTS, buildEndpointUrl } from "@/api/endpoint";
import type { ProcessInfo } from "@/types";

export async function fetchRegisteredProcesses(baseUrl: string) {
    const response = await httpRequest<ProcessInfo[]>({
        url: buildEndpointUrl(baseUrl, ENDPOINTS.list),
        method: "GET",
    });

    return response
}
