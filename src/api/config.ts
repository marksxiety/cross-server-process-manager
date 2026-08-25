interface HttpRequestOptions {
    url: string;
    port?: number;
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: unknown;
}

export async function httpRequest({
    url,
    port,
    method = "GET",
    body,
}: HttpRequestOptions) {
    const endpoint = port ? `${url}:${port}` : url;

    return fetch(endpoint, {
        method,
        body: body ? JSON.stringify(body) : undefined,
        headers: {
            "Content-Type": "application/json",
        },
    });
}