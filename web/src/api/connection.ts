import { httpRequest } from "@/api/http";
import type { RegisteredServer } from "@/types/server";

type Method = "GET" | "POST" | "PUT" | "DELETE";

export type ApiTarget = Pick<RegisteredServer, "protocol" | "host" | "port"> & {
    authToken?: string;
};

function buildUrl(target: ApiTarget, path: string): string {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${target.protocol}://${target.host}:${target.port}${cleanPath}`;
}

export function createConnection(target: ApiTarget) {
    const authHeaders = target.authToken
        ? { Authorization: `Bearer ${target.authToken}` }
        : undefined;

    const request = <T = unknown>(path: string, method: Method, body?: unknown, signal?: AbortSignal) =>
        httpRequest<T>({ url: buildUrl(target, path), method, body, headers: authHeaders, signal });

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