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
    NOT_FOUND: "Route not found",
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
