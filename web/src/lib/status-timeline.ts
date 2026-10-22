import { GAP_STEP_FACTOR } from "@/lib/metric-chart";
import type { RestartTimestamps } from "@/lib/metric-restart";
import { formatSeriesLabel, seriesIdentity } from "@/lib/prometheus";
import { statusFromCode } from "@/lib/status-catalog";
import type { EffectiveStatus } from "@/types/process";
import type {
    PrometheusPoint,
    PrometheusSeries,
    ResolvedMetricsRange,
    StatusTimelineData,
    StatusTimelineKind,
    StatusTimelineLane,
    StatusTimelineProcess,
    StatusTimelineRestart,
    StatusTimelineSegment,
} from "@/types/prometheus";

const NO_DATA_KIND: StatusTimelineKind = "no_data";

export interface BuildStatusTimelineOptions {
    restarts?: RestartTimestamps;
    range?: ResolvedMetricsRange | null;
}

function inferStepMs(points: PrometheusPoint[]): number | null {
    const deltas: number[] = [];

    for (let index = 1; index < points.length; index += 1) {
        const delta = points[index]!.timestamp - points[index - 1]!.timestamp;
        if (delta > 0) deltas.push(delta);
    }

    if (deltas.length === 0) return null;

    deltas.sort((a, b) => a - b);
    return deltas[Math.floor(deltas.length / 2)] ?? null;
}

function appendSegment(
    segments: StatusTimelineSegment[],
    segment: StatusTimelineSegment,
    restartSet: Set<number>,
): void {
    if (segment.end <= segment.start) return;

    const previous = segments[segments.length - 1];

    if (
        previous !== undefined &&
        previous.laneIndex === segment.laneIndex &&
        previous.kind === segment.kind &&
        previous.end === segment.start &&
        !restartSet.has(segment.start)
    ) {
        previous.end = segment.end;
        return;
    }

    segments.push(segment);
}

function uniqueProcesses(
    processes: StatusTimelineProcess[],
): StatusTimelineProcess[] {
    const seen = new Set<string>();

    return processes.filter((process) => {
        if (seen.has(process.label)) return false;
        seen.add(process.label);
        return true;
    });
}

export function buildStatusTimeline(
    statusSeries: PrometheusSeries[],
    processes: StatusTimelineProcess[],
    options: BuildStatusTimelineOptions = {},
): StatusTimelineData {
    const statusByLabel = new Map<string, PrometheusSeries>();

    for (const series of statusSeries) {
        if (series.points.length === 0) continue;
        statusByLabel.set(formatSeriesLabel(series), series);
    }

    const orderedProcesses = uniqueProcesses(
        processes.length > 0
            ? processes
            : [...statusByLabel.entries()].map(([label, series]) => ({
                  label,
                  identity: seriesIdentity(series.metric),
              })),
    );

    const lanes: StatusTimelineLane[] = orderedProcesses.map(
        (process, index) => ({
            id: process.identity || process.label,
            label: process.label,
            index,
        }),
    );

    if (lanes.length === 0) {
        return {
            lanes,
            segments: [],
            restarts: [],
            start: 0,
            end: 0,
            stepMs: null,
        };
    }

    const allPoints: PrometheusPoint[] = [];
    for (const series of statusSeries) {
        allPoints.push(...series.points);
    }

    const inferredStep = inferStepMs(allPoints);
    const stepMs = options.range ? options.range.step * 1000 : inferredStep;

    let dataStart = Number.POSITIVE_INFINITY;
    let dataEnd = Number.NEGATIVE_INFINITY;

    for (const point of allPoints) {
        if (point.timestamp < dataStart) dataStart = point.timestamp;
        if (point.timestamp > dataEnd) dataEnd = point.timestamp;
    }

    if (Number.isFinite(dataEnd) && stepMs !== null && stepMs > 0) {
        dataEnd += stepMs;
    }

    const start =
        options.range?.start ?? (Number.isFinite(dataStart) ? dataStart : 0);
    const end = options.range?.end ?? (Number.isFinite(dataEnd) ? dataEnd : 0);

    if (end <= start) {
        return { lanes, segments: [], restarts: [], start, end, stepMs };
    }

    const segments: StatusTimelineSegment[] = [];
    const restarts: StatusTimelineRestart[] = [];
    const gapThreshold =
        stepMs !== null && Number.isFinite(stepMs) && stepMs > 0
            ? stepMs * GAP_STEP_FACTOR
            : null;

    for (let laneIndex = 0; laneIndex < lanes.length; laneIndex += 1) {
        const lane = lanes[laneIndex]!;
        const process = orderedProcesses[laneIndex]!;
        const series = statusByLabel.get(process.label);
        const identity = series
            ? seriesIdentity(series.metric)
            : process.identity;
        const laneRestarts = [
            ...new Set(options.restarts?.get(identity) ?? []),
        ]
            .filter((timestamp) => timestamp >= start && timestamp <= end)
            .sort((a, b) => a - b);
        const restartSet = new Set(laneRestarts);

        restarts.push(
            ...laneRestarts.map((timestamp) => ({
                laneId: lane.id,
                laneIndex,
                timestamp,
            })),
        );

        const appendNoData = (from: number, to: number) => {
            appendSegment(
                segments,
                {
                    laneId: lane.id,
                    laneIndex,
                    kind: NO_DATA_KIND,
                    code: null,
                    start: Math.max(start, from),
                    end: Math.min(end, to),
                },
                restartSet,
            );
        };

        if (series === undefined || series.points.length === 0) {
            appendNoData(start, end);
            continue;
        }

        const points = [...series.points].sort(
            (a, b) => a.timestamp - b.timestamp,
        );
        const first = points[0]!;
        const last = points[points.length - 1]!;

        if (gapThreshold !== null && first.timestamp - start > gapThreshold) {
            appendNoData(start, first.timestamp);
        }

        const appendStatus = (
            from: number,
            to: number,
            kind: EffectiveStatus,
            code: number,
        ) => {
            const clampedStart = Math.max(start, from);
            const clampedEnd = Math.min(end, to);
            if (clampedEnd <= clampedStart) return;

            const splitPoints = laneRestarts.filter(
                (timestamp) =>
                    timestamp > clampedStart && timestamp < clampedEnd,
            );
            let cursor = clampedStart;

            for (const timestamp of splitPoints) {
                appendSegment(
                    segments,
                    {
                        laneId: lane.id,
                        laneIndex,
                        kind,
                        code,
                        start: cursor,
                        end: timestamp,
                    },
                    restartSet,
                );
                cursor = timestamp;
            }

            appendSegment(
                segments,
                {
                    laneId: lane.id,
                    laneIndex,
                    kind,
                    code,
                    start: cursor,
                    end: clampedEnd,
                },
                restartSet,
            );
        };

        for (let index = 0; index < points.length; index += 1) {
            const point = points[index]!;
            const next = points[index + 1];
            const nextTimestamp = next?.timestamp;
            const sampleEnd =
                stepMs !== null && stepMs > 0
                    ? point.timestamp + stepMs
                    : (nextTimestamp ?? end);
            const kind = statusFromCode(point.value);
            const code = Math.trunc(point.value);

            if (
                nextTimestamp !== undefined &&
                gapThreshold !== null &&
                nextTimestamp - point.timestamp > gapThreshold
            ) {
                const breakAt = Math.min(sampleEnd, nextTimestamp);
                appendStatus(point.timestamp, breakAt, kind, code);
                appendNoData(breakAt, nextTimestamp);
                continue;
            }

            appendStatus(
                point.timestamp,
                nextTimestamp ?? Math.min(sampleEnd, end),
                kind,
                code,
            );
        }

        const lastSampleEnd =
            stepMs !== null && stepMs > 0
                ? last.timestamp + stepMs
                : last.timestamp;

        if (gapThreshold !== null && end - lastSampleEnd > gapThreshold) {
            appendNoData(lastSampleEnd, end);
        }
    }

    return { lanes, segments, restarts, start, end, stepMs };
}
