import { resolveMetricsFixture } from "@/demo/metrics-fixtures";
import { isDemoMode } from "@/lib/demo-mode";
import { buildSelector, parseMatrixResult } from "@/lib/prometheus";
import type { ApiError } from "@/types/api";
import type {
    ProcessMetricName,
    PrometheusSeries,
    PrometheusTarget,
    ResolvedMetricsRange,
} from "@/types/prometheus";

export class PrometheusError extends Error {
    readonly code: string;
    readonly status: number;

    constructor(message: string, code: string, status = 0) {
        super(message);
        this.name = "PrometheusError";
        this.code = code;
        this.status = status;
    }
}

function prometheusBaseUrl(): string {
    return (import.meta.env.VITE_PROMETHEUS_URL ?? "").trim().replace(/\/+$/, "");
}

export function isPrometheusConfigured(): boolean {
    return prometheusBaseUrl() !== "" || isDemoMode();
}

export function isAbortError(cause: unknown): boolean {
    return cause instanceof Error && cause.name === "AbortError";
}

export function toPrometheusApiError(error: PrometheusError): ApiError {
    return { code: error.code, message: error.message, status: error.status };
}

export async function queryRange(
    metric: ProcessMetricName,
    target: PrometheusTarget,
    range: ResolvedMetricsRange,
    signal?: AbortSignal,
): Promise<PrometheusSeries[]> {
    if (isDemoMode()) return resolveMetricsFixture(metric, target, range);

    const baseUrl = prometheusBaseUrl();
    if (baseUrl === "") {
        throw new PrometheusError(
            "Prometheus is not configured. Set VITE_PROMETHEUS_URL in .env and restart the web app.",
            "PROMETHEUS_NOT_CONFIGURED",
        );
    }

    const params = new URLSearchParams({
        query: buildSelector(metric, target),
        start: String(range.start / 1000),
        end: String(range.end / 1000),
        step: String(range.step),
    });

    let response: Response;
    try {
        response = await fetch(`${baseUrl}/api/v1/query_range?${params.toString()}`, {
            signal,
            headers: { Accept: "application/json" },
        });
    } catch (cause) {
        if (isAbortError(cause)) throw cause;

        const detail = cause instanceof Error ? cause.message : String(cause);
        throw new PrometheusError(
            `Could not reach Prometheus at ${baseUrl}: ${detail}`,
            "PROMETHEUS_UNREACHABLE",
        );
    }

    const body = await response.text();
    let payload: unknown;
    try {
        payload = JSON.parse(body);
    } catch {
        throw new PrometheusError(
            `Prometheus returned a non-JSON response (HTTP ${response.status}).`,
            "PROMETHEUS_INVALID_RESPONSE",
            response.status,
        );
    }

    const envelope = payload as {
        status?: unknown;
        data?: { resultType?: unknown; result?: unknown };
        error?: unknown;
        errorType?: unknown;
    };

    if (!response.ok || envelope.status !== "success") {
        const message =
            typeof envelope.error === "string"
                ? envelope.error
                : `Prometheus request failed (HTTP ${response.status}).`;
        const prefix =
            typeof envelope.errorType === "string" ? `${envelope.errorType}: ` : "";

        throw new PrometheusError(
            `${prefix}${message}`,
            "PROMETHEUS_QUERY_ERROR",
            response.status,
        );
    }

    if (envelope.data?.resultType !== "matrix") {
        throw new PrometheusError(
            "Prometheus returned an unexpected result type.",
            "PROMETHEUS_INVALID_RESPONSE",
            response.status,
        );
    }

    return parseMatrixResult(envelope.data.result);
}
