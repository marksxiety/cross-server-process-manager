import { PROCESS_METRICS } from "@/lib/prometheus";
import type { LoadStatus } from "@/types/dashboard";
import type { MetricsData, ProcessMetricName } from "@/types/prometheus";

const DEFAULT_DESCRIPTION = "Fetching metrics…";

export function metricsLoadingDescription(subject: string): string {
    return subject.trim() === ""
        ? DEFAULT_DESCRIPTION
        : `Fetching metrics for ${subject}…`;
}

type MetricsInitialLoadInput = {
    enabled: boolean;
    status: Record<ProcessMetricName, LoadStatus>;
    errors: Partial<Record<ProcessMetricName, unknown>>;
    data: MetricsData;
};

/**
 * True while the first load for a scope is still in flight: the scope is enabled,
 * nothing has errored, not every metric has settled and no series has arrived yet.
 * Used to show the centered loader and to lock the metrics toolbar.
 */
export function isMetricsInitialLoad({
    enabled,
    status,
    errors,
    data,
}: MetricsInitialLoadInput): boolean {
    if (!enabled) return false;
    if (Object.keys(errors).length > 0) return false;

    const allSettled = PROCESS_METRICS.every(
        (metric) => status[metric] === "success" || status[metric] === "error",
    );
    if (allSettled) return false;

    return !Object.values(data).some((series) => (series?.length ?? 0) > 0);
}
