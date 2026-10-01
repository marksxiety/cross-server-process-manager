import type { ApiResponse } from "@/types/api";

export const MAX_REQUEST_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 300;

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(response: ApiResponse<unknown>): boolean {
    return response.status === 0 || response.status >= 500;
}

function withAttempts(message: string, attempts: number): string {
    return `${message} (${attempts}/${attempts} attempts)`;
}

export async function withRetry<T>(
    request: () => Promise<ApiResponse<T>>,
    attempts = MAX_REQUEST_ATTEMPTS
): Promise<ApiResponse<T>> {
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            const response = await request();

            if (!isRetryable(response)) return response;
            if (attempt === attempts) {
                return { ...response, message: withAttempts(response.message, attempts) };
            }
        } catch (cause) {
            if (attempt === attempts) {
                throw new Error(withAttempts((cause as Error).message, attempts), { cause });
            }
        }

        await delay(RETRY_BASE_DELAY_MS * attempt);
    }

    throw new Error("withRetry: exhausted without a result");
}
