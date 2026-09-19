import type { ApiResponse } from "@/types/api";
import type { RegisteredServer } from "@/types/server";

const SERVERS_PATH = "/data/servers.json";

// A missing, unreachable, non-OK, or unparseable source is treated as an empty
// server list so the dashboard can render its empty state instead of an error.
function emptyServers(status = 0): ApiResponse<RegisteredServer[]> {
    return { success: true, message: "No registered servers", info: [], status };
}

// Validates a raw server entry and defaults a missing/invalid is_active to true
// so legacy files without the flag keep working. Used by fetchServers.
function normalizeServer(value: unknown): RegisteredServer | null {
    if (typeof value !== "object" || value === null) return null;

    const candidate = value as Partial<RegisteredServer>;
    if (
        typeof candidate.server !== "string" ||
        (candidate.protocol !== "http" && candidate.protocol !== "https") ||
        typeof candidate.host !== "string" ||
        typeof candidate.port !== "number"
    ) {
        return null;
    }

    return {
        server: candidate.server,
        protocol: candidate.protocol,
        host: candidate.host,
        port: candidate.port,
        is_active: typeof candidate.is_active === "boolean" ? candidate.is_active : true,
    };
}

// withInactive defaults to false so callers only ever receive active servers
// unless they explicitly ask for the full registry.
async function fetchServers(withInactive = false): Promise<ApiResponse<RegisteredServer[]>> {
    let response: Response;
    try {
        response = await fetch(SERVERS_PATH);
    } catch (cause) {
        console.warn("server.service: could not reach server source", cause);
        return emptyServers();
    }

    const text = await response.text();

    if (!response.ok) {
        console.warn(`server.service: servers request failed (${response.status} ${response.statusText})`);
        return emptyServers(response.status);
    }

    try {
        const parsed = JSON.parse(text) as unknown;
        const servers = Array.isArray(parsed)
            ? parsed
                .map(normalizeServer)
                .filter((server): server is RegisteredServer => server !== null)
            : [];

        return {
            success: true,
            message: "Servers loaded successfully",
            info: withInactive ? servers : servers.filter((server) => server.is_active),
            status: response.status,
        };
    } catch (cause) {
        console.warn("server.service: server source is not valid JSON", cause);
        return emptyServers(response.status);
    }
}

export function serverService() {
    return {
        list: (withInactive = false) => fetchServers(withInactive),
    };
}
