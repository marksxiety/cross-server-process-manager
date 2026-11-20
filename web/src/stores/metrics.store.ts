import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isDemoMode } from "@/lib/demo-mode";
import {
    DEFAULT_METRICS_RANGE,
    DEFAULT_METRICS_REFRESH_MS,
} from "@/lib/prometheus";
import type { MetricBasis, MetricsRange } from "@/types/prometheus";

export interface RecentAbsoluteRange {
    start: number;
    end: number;
}

export const MAX_RECENT_ABSOLUTE_RANGES = 10;

interface MetricsState {
    range: MetricsRange;
    recentAbsoluteRanges: RecentAbsoluteRange[];
    refreshMs: number;
    cpuBasis: MetricBasis;
    memoryBasis: MetricBasis;
    setRange: (range: MetricsRange) => void;
    setRefreshMs: (refreshMs: number) => void;
    setCpuBasis: (basis: MetricBasis) => void;
    setMemoryBasis: (basis: MetricBasis) => void;
}

/** Puts an absolute range first, dropping an older identical entry. */
export function addRecentAbsoluteRange(
    recents: RecentAbsoluteRange[],
    range: MetricsRange,
): RecentAbsoluteRange[] {
    if (range.kind !== "absolute") return recents;

    const next = { start: range.start, end: range.end };
    const withoutDuplicate = recents.filter(
        (entry) => entry.start !== next.start || entry.end !== next.end,
    );

    return [next, ...withoutDuplicate].slice(0, MAX_RECENT_ABSOLUTE_RANGES);
}

/** Drops malformed and duplicate entries from restored storage. */
export function normalizeRecentAbsoluteRanges(
    value: unknown,
): RecentAbsoluteRange[] {
    if (!Array.isArray(value)) return [];

    const ranges: RecentAbsoluteRange[] = [];

    for (const entry of value) {
        if (typeof entry !== "object" || entry === null) continue;

        const candidate = entry as { start?: unknown; end?: unknown };
        if (
            typeof candidate.start !== "number" ||
            !Number.isFinite(candidate.start) ||
            typeof candidate.end !== "number" ||
            !Number.isFinite(candidate.end) ||
            candidate.start >= candidate.end
        ) {
            continue;
        }

        if (
            ranges.some(
                (range) =>
                    range.start === candidate.start &&
                    range.end === candidate.end,
            )
        ) {
            continue;
        }

        ranges.push({ start: candidate.start, end: candidate.end });
        if (ranges.length === MAX_RECENT_ABSOLUTE_RANGES) break;
    }

    return ranges;
}

function isMetricBasis(value: unknown): value is MetricBasis {
    return value === "server" || value === "process";
}

function isMetricsRange(value: unknown): value is MetricsRange {
    if (typeof value !== "object" || value === null) return false;

    const candidate = value as {
        kind?: unknown;
        durationMs?: unknown;
        start?: unknown;
        end?: unknown;
    };

    if (candidate.kind === "relative") {
        return (
            typeof candidate.durationMs === "number" &&
            Number.isFinite(candidate.durationMs) &&
            candidate.durationMs > 0
        );
    }

    if (candidate.kind === "absolute") {
        return (
            typeof candidate.start === "number" &&
            Number.isFinite(candidate.start) &&
            typeof candidate.end === "number" &&
            Number.isFinite(candidate.end) &&
            candidate.start < candidate.end
        );
    }

    return false;
}

export const useMetricsStore = create<MetricsState>()(
    persist(
        (set) => ({
            range: DEFAULT_METRICS_RANGE,
            recentAbsoluteRanges: [],
            refreshMs: DEFAULT_METRICS_REFRESH_MS,
            cpuBasis: "server",
            memoryBasis: "server",
            setRange: (range) =>
                set((state) => ({
                    range,
                    recentAbsoluteRanges: addRecentAbsoluteRange(
                        state.recentAbsoluteRanges,
                        range,
                    ),
                })),
            setRefreshMs: (refreshMs) => set({ refreshMs }),
            setCpuBasis: (cpuBasis) => set({ cpuBasis }),
            setMemoryBasis: (memoryBasis) => set({ memoryBasis }),
        }),
        {
            name: isDemoMode() ? "metrics-preferences-demo" : "metrics-preferences",
            version: 1,
            partialize: (state) => ({
                range: state.range,
                recentAbsoluteRanges: state.recentAbsoluteRanges,
                refreshMs: state.refreshMs,
                cpuBasis: state.cpuBasis,
                memoryBasis: state.memoryBasis,
            }),
            merge: (persistedState, currentState) => {
                const persisted = persistedState as Partial<MetricsState> | null;
                return {
                    ...currentState,
                    range: isMetricsRange(persisted?.range)
                        ? persisted.range
                        : DEFAULT_METRICS_RANGE,
                    recentAbsoluteRanges: normalizeRecentAbsoluteRanges(
                        persisted?.recentAbsoluteRanges,
                    ),
                    refreshMs:
                        typeof persisted?.refreshMs === "number" &&
                        Number.isFinite(persisted.refreshMs) &&
                        persisted.refreshMs >= 0
                            ? persisted.refreshMs
                            : DEFAULT_METRICS_REFRESH_MS,
                    cpuBasis: isMetricBasis(persisted?.cpuBasis)
                        ? persisted.cpuBasis
                        : "server",
                    memoryBasis: isMetricBasis(persisted?.memoryBasis)
                        ? persisted.memoryBasis
                        : "server",
                };
            },
            onRehydrateStorage: () => (_state, error) => {
                if (error) {
                    console.warn("metrics-store: could not restore preferences", error);
                }
            },
        },
    ),
);
