import { httpRequest } from "@/api/http";
import type { RegisteredServer } from "@/types/server";

type Method = "GET" | "POST" | "DELETE";

export type ApiTarget = Pick<RegisteredServer, "protocol" | "host" | "port">;

function buildUrl(target: ApiTarget, path: string): string {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${target.protocol}://${target.host}:${target.port}${cleanPath}`;
}

export function createConnection(target: ApiTarget) {
    const request = <T = unknown>(path: string, method: Method, body?: unknown) =>
        httpRequest<T>({ url: buildUrl(target, path), method, body });

    return {
        get: <T = unknown>(path: string) => request<T>(path, "GET"),
        post: <T = unknown>(path: string, body?: unknown) => request<T>(path, "POST", body),
        del: <T = unknown>(path: string) => request<T>(path, "DELETE"),
    };
}

export type Connection = ReturnType<typeof createConnection>;