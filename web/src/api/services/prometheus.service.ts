import { resolveMetricsFixture } from "@/demo/metrics-fixtures";
import { isDemoMode } from "@/lib/demo-mode";
import {
    buildSelectorForScope,
    escapeLabelValue,
    parseMatrixResult,
    PROMETHEUS_SERVER_LABEL,
} from "@/lib/prometheus";
import type { ApiError } from "@/types/api";
import type {
    MetricName,
    MetricsScope,
    PrometheusSeries,
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

type PrometheusEnvelope = {
    status?: unknown;
    data?: unknown;
    error?: unknown;
    errorType?: unknown;
};

type PrometheusResponse = {
    envelope: PrometheusEnvelope;
    status: number;
};

async function requestPrometheus(
    path: string,
    signal?: AbortSignal,
): Promise<PrometheusResponse> {
    const baseUrl = prometheusBaseUrl();
    if (baseUrl === "") {
        throw new PrometheusError(
            "Prometheus is not configured. Set VITE_PROMETHEUS_URL in .env and restart the web app.",
            "PROMETHEUS_NOT_CONFIGURED",
        );
    }

    let response: Response;
    try {
        response = await fetch(`${baseUrl}${path}`, {
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

    const envelope = payload as PrometheusEnvelope;

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

    return { envelope, status: response.status };
}

export async function queryRange(
    metric: MetricName,
    scope: MetricsScope,
    range: ResolvedMetricsRange,
    signal?: AbortSignal,
): Promise<PrometheusSeries[]> {
    if (isDemoMode()) return resolveMetricsFixture(metric, scope, range);

    const params = new URLSearchParams({
        query: buildSelectorForScope(metric, scope),
        start: String(range.start / 1000),
        end: String(range.end / 1000),
        step: String(range.step),
    });

    const { envelope, status } = await requestPrometheus(
        `/api/v1/query_range?${params.toString()}`,
        signal,
    );
    const data = envelope.data as
        | { resultType?: unknown; result?: unknown }
        | undefined;

    if (data?.resultType !== "matrix") {
        throw new PrometheusError(
            "Prometheus returned an unexpected result type.",
            "PROMETHEUS_INVALID_RESPONSE",
            status,
        );
    }

    return parseMatrixResult(data.result);
}

const SERVER_AVAILABILITY_LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000;

function serverAvailabilitySelector(server: string): string {
    return `{${PROMETHEUS_SERVER_LABEL}="${escapeLabelValue(server)}"}`;
}

/**
 * True when Prometheus retains at least one series for the server, regardless
 * of the currently selected chart range. Used to distinguish a server that has
 * never been scraped from a range that simply has no samples.
 */
export async function hasServerSeries(
    server: string,
    signal?: AbortSignal,
): Promise<boolean> {
    if (isDemoMode()) return true;
    if (server.trim() === "") return false;

    const now = Date.now();
    const params = new URLSearchParams({
        "match[]": serverAvailabilitySelector(server),
        start: String((now - SERVER_AVAILABILITY_LOOKBACK_MS) / 1000),
        end: String(now / 1000),
    });

    const { envelope } = await requestPrometheus(
        `/api/v1/series?${params.toString()}`,
        signal,
    );

    return Array.isArray(envelope.data) && envelope.data.length > 0;
}
