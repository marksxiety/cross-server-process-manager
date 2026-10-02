import type { ApiError, ApiResponse } from "@/types/api";

export const UNREACHABLE_ERROR_CODE = "UNREACHABLE";
export const UNKNOWN_ERROR_CODE = "UNKNOWN";

const ERROR_CODE_LABELS: Record<string, string> = {
    PROCESS_NOT_FOUND: "Process not found",
    SCRIPT_NOT_FOUND: "Script not found",
    PM2_DAEMON_UNAVAILABLE: "PM2 daemon unavailable",
    PM2_OPERATION_FAILED: "PM2 operation failed",
    INVALID_PROCESS_ID: "Invalid process id",
    INVALID_PROCESS_CONFIGURATION: "Invalid process configuration",
    VALIDATION_FAILED: "Validation failed",
    UNAUTHORIZED: "Unauthorized",
    NOT_FOUND: "Not found",
    INVALID_ID: "Invalid id",
    DUPLICATE_SERVER: "Server already registered",
    DUPLICATE_HOST: "Host already registered",
    DUPLICATE_TEMPLATE: "Template already registered",
    DATABASE_UNAVAILABLE: "Database unavailable",
    PARSE: "Malformed request body",
    INVALID_COOKIE_SIGNATURE: "Invalid cookie signature",
    INVALID_FILE_TYPE: "Invalid file type",
    CORS_ORIGIN_NOT_ALLOWED: "Origin not allowed",
    INTERNAL_SERVER_ERROR: "Internal server error",
    [UNKNOWN_ERROR_CODE]: "Unexpected error",
    [UNREACHABLE_ERROR_CODE]: "Unreachable",
};

const MISSING_CODE_LABEL = "Connection error";

export function errorCodeLabel(code: string | undefined): string {
    if (!code) return MISSING_CODE_LABEL;
    return ERROR_CODE_LABELS[code] ?? code;
}

/** Normalizes a failed ApiResponse into the shared ApiError shape, synthesizing a code when the envelope has none. */
export function toApiError(response: Pick<ApiResponse, "code" | "message" | "status">): ApiError {
    return {
        code: response.code ?? (response.status === 0 ? UNREACHABLE_ERROR_CODE : UNKNOWN_ERROR_CODE),
        message: response.message,
        status: response.status,
    };
}

/** Maps a rejected request (network failure, exhausted retries) to an ApiError. */
export function toUnreachableError(cause: unknown): ApiError {
    return {
        code: UNREACHABLE_ERROR_CODE,
        message: cause instanceof Error ? cause.message : String(cause),
        status: 0,
    };
}
