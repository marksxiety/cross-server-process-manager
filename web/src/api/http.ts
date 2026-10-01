import type { ApiResponse } from "@/types/api";

interface HttpRequestOptions {
    url: string;
    protocol?: "http" | "https";
    port?: number;
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: unknown;
    headers?: Record<string, string>;
}

export async function httpRequest<T = unknown>({
    url,
    protocol = "http",
    port,
    method = "GET",
    body,
    headers,
}: HttpRequestOptions): Promise<ApiResponse<T>> {
    if (typeof url !== "string" || url.trim() === "") {
        throw new TypeError("httpRequest: url is required and must be a non-empty string");
    }
    const hasScheme = url.includes("://");
    if (!hasScheme) {
        if (protocol !== "http" && protocol !== "https") {
            throw new TypeError(`httpRequest: protocol must be "http" or "https", got "${protocol}"`);
        }
        if (port !== undefined && (!Number.isInteger(port) || port < 1 || port > 65535)) {
            throw new TypeError("httpRequest: port must be an integer between 1 and 65535");
        }
    }

    const endpoint = hasScheme ? url : `${protocol}://${url}${port !== undefined ? `:${port}` : ""}`;

    let response: Response;
    try {
        response = await fetch(endpoint, {
            method,
            body: body === undefined ? undefined : JSON.stringify(body),
            headers: {
                "Content-Type": "application/json",
                ...headers,
            },
        });
    } catch (cause) {
        const err = cause as Error;
        throw new Error(`Network error reaching ${endpoint}: ${err.message}`, { cause });
    }

    const text = await response.text();
    if (text.length === 0) {
        return {
            success: response.ok,
            message: response.statusText,
            info: null,
            status: response.status,
        };
    }

    try {
        const parsed = JSON.parse(text) as Omit<ApiResponse<T>, "status">;
        return { ...parsed, status: response.status };
    } catch {
        return {
            success: false,
            message: `${response.statusText} (non-JSON response)`,
            info: null,
            status: response.status,
        };
    }
}