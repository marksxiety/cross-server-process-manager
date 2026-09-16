import { httpRequest } from "@/api/http";
import type { RegisteredServer } from "@/types/server";

type Method = "GET" | "POST" | "DELETE";

function buildUrl(server: RegisteredServer, path: string): string {
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${server.protocol}://${server.host}:${server.port}${cleanPath}`;
}

export function createConnection(server: RegisteredServer) {
    const request = <T = unknown>(path: string, method: Method, body?: unknown) =>
        httpRequest<T>({ url: buildUrl(server, path), method, body });

    return {
        get: <T = unknown>(path: string) => request<T>(path, "GET"),
        post: <T = unknown>(path: string, body?: unknown) => request<T>(path, "POST", body),
        del: <T = unknown>(path: string) => request<T>(path, "DELETE"),
    };
}

export type Connection = ReturnType<typeof createConnection>;