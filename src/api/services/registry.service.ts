import type { ApiResponse } from "@/types/api";
import type { RegisteredServer } from "@/types/server";

const REGISTRY_PATH = "/data/servers.json";

export async function fetchRegisteredServers(): Promise<ApiResponse<RegisteredServer[]>> {
    let response: Response;
    try {
        response = await fetch(REGISTRY_PATH);
    } catch (cause) {
        const err = cause as Error;
        return { success: false, message: `Could not reach server registry: ${err.message}`, info: null, status: 0 };
    }

    const text = await response.text();

    if (!response.ok) {
        return { success: false, message: `Failed to load server registry (${response.statusText})`, info: null, status: response.status };
    }

    try {
        const servers = JSON.parse(text) as RegisteredServer[];
        return { success: true, message: "Server registry loaded successfully", info: servers, status: response.status };
    } catch {
        return { success: false, message: "Server registry file is not valid JSON", info: null, status: response.status };
    }
}