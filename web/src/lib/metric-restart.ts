import { seriesIdentity } from "@/lib/prometheus";
import type { MetricsData, PrometheusSeries } from "@/types/prometheus";

export type RestartTimestamps = Map<string, number[]>;

type RestartPredicate = (previous: number, current: number) => boolean;

function collectRestarts(
    seriesList: PrometheusSeries[] | undefined,
    isRestart: RestartPredicate,
    restarts: Map<string, Set<number>>,
): void {
    for (const series of seriesList ?? []) {
        const identity = seriesIdentity(series.metric);

        for (let index = 1; index < series.points.length; index += 1) {
            const previous = series.points[index - 1]!;
            const current = series.points[index]!;

            if (!isRestart(previous.value, current.value)) continue;

            const timestamps = restarts.get(identity) ?? new Set<number>();
            timestamps.add(current.timestamp);
            restarts.set(identity, timestamps);
        }
    }
}

export function findRestartTimestamps(data: MetricsData): RestartTimestamps {
    const collected = new Map<string, Set<number>>();

    collectRestarts(
        data.pm2_uptime,
        (previous, current) => current < previous,
        collected,
    );
    collectRestarts(
        data.pm2_start_time_seconds,
        (previous, current) =>
            previous > 0 && current > 0 && current !== previous,
        collected,
    );

    const restarts: RestartTimestamps = new Map();

    for (const [identity, timestamps] of collected) {
        restarts.set(identity, [...timestamps].sort((a, b) => a - b));
    }

    return restarts;
}
