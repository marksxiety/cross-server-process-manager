import { httpRequest } from "@/api/http";
import type { RegisteredServer } from "@/types/server";

type Method = "GET" | "POST" | "PUT" | "DELETE";

export interface RefreshAuthResult {
    token: string | null;
    /** True when the session is definitively gone and the caller should sign out. */
    terminal?: boolean;
}

export type ApiTarget = Pick<RegisteredServer, "protocol" | "host" | "port"> & {
    authToken?: string;
    /** Called after a 401. Returns a fresh access token to retry with. */
    refreshAuth?: (staleToken?: string) => Promise<RefreshAuthResult>;
    onUnauthorized?: () => void;
};

function buildUrl(target: ApiTarget, path: string): string {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${target.protocol}://${target.host}:${target.port}${cleanPath}`;
}

function authHeaders(token?: string): Record<string, string> | undefined {
    return token ? { Authorization: `Bearer ${token}` } : undefined;
}

export function createConnection(target: ApiTarget) {
    const send = <T>(path: string, method: Method, token: string | undefined, body?: unknown, signal?: AbortSignal) =>
        httpRequest<T>({
            url: buildUrl(target, path),
            method,
            body,
            headers: authHeaders(token),
            signal,
        });

    const request = async <T = unknown>(
        path: string,
        method: Method,
        body?: unknown,
        signal?: AbortSignal
    ) => {
        let token = target.authToken;
        let response = await send<T>(path, method, token, body, signal);
        let terminal = false;

        if (response.status === 401 && target.refreshAuth) {
            const refreshed = await target.refreshAuth(token);
            if (refreshed.token) {
                token = refreshed.token;
                response = await send<T>(path, method, token, body, signal);
                terminal = response.status === 401;
            } else {
                terminal = refreshed.terminal === true;
            }
        }

        // A 401 after a transient refresh failure must not sign the user out.
        if (response.status === 401 && (!target.refreshAuth || terminal)) {
            target.onUnauthorized?.();
        }
        return response;
    };

    return {
        get: <T = unknown>(path: string, signal?: AbortSignal) => request<T>(path, "GET", undefined, signal),
        post: <T = unknown>(path: string, body?: unknown, signal?: AbortSignal) =>
            request<T>(path, "POST", body, signal),
        put: <T = unknown>(path: string, body?: unknown, signal?: AbortSignal) =>
            request<T>(path, "PUT", body, signal),
        del: <T = unknown>(path: string, signal?: AbortSignal) => request<T>(path, "DELETE", undefined, signal),
    };
}

export type Connection = ReturnType<typeof createConnection>;
