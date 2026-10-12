import { createConnection } from "@/api/connection";
import type { ApiResponse } from "@/types/api";
import type { ServerInput } from "@/types/server";

export interface AgentStatus {
    pid: number;
}

export type AgentProbeTarget = Pick<ServerInput, "protocol" | "host" | "port">;

const PROBE_TIMEOUT_MS = 5_000;

function unreachableMessage(target: AgentProbeTarget, detail: string): string {
    return `No XPM agent responded at ${target.host}:${target.port} (${detail})`;
}

/** True when the response is the agent's public liveness banner — an HTTP 200
 *  alone is not enough, since any web server answers those. */
export function isAgentStatusResponse(response: ApiResponse<unknown>): response is ApiResponse<AgentStatus> {
    return (
        response.status === 200 &&
        response.success &&
        typeof response.info === "object" &&
        response.info !== null &&
        typeof (response.info as AgentStatus).pid === "number"
    );
}

/** Pings the agent's public root route (`GET /`) to confirm an XPM agent is
 *  set up at the target before registering it. The root route needs no auth
 *  token, unlike `/pm2/*`. Never throws — probe failures come back as a failed
 *  envelope, mirroring `serverService().list`. */
export async function probeAgent(target: AgentProbeTarget, timeoutMs = PROBE_TIMEOUT_MS): Promise<ApiResponse<AgentStatus>> {
    let response: ApiResponse<unknown>;
    try {
        response = await createConnection(target).get<AgentStatus>("/", AbortSignal.timeout(timeoutMs));
    } catch (cause) {
        const detail = cause instanceof Error ? cause.message : String(cause);
        return { success: false, message: unreachableMessage(target, detail), info: null, status: 0 };
    }

    if (!isAgentStatusResponse(response)) {
        return {
            success: false,
            message: unreachableMessage(target, `HTTP ${response.status}`),
            info: null,
            status: response.status,
        };
    }

    return response;
}
