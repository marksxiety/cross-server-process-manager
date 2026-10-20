import {
    toPrometheusApiError,
    type PrometheusError,
} from "@/api/services/prometheus.service";
import type { ApiError } from "@/types/api";
import type { LoadStatus } from "@/types/dashboard";
import type { ProcessMetricName } from "@/types/prometheus";

export function metricDescription(
    status: LoadStatus,
    value: string | null,
): string {
    if (status === "loading" || status === "idle") return "Loading…";
    if (status === "error") return "Unavailable";
    return value ?? "No data in this range.";
}

export function metricError(
    errors: Partial<Record<ProcessMetricName, PrometheusError>>,
    metric: ProcessMetricName,
): ApiError | null {
    const error = errors[metric];
    return error ? toPrometheusApiError(error) : null;
}

export function combineStatus(a: LoadStatus, b: LoadStatus): LoadStatus {
    if (a === "error" || b === "error") return "error";
    if (a === "loading" || b === "loading" || a === "idle" || b === "idle") {
        return "loading";
    }
    return "success";
}
