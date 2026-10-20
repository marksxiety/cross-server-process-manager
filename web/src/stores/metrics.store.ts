import { create } from "zustand";
import { persist } from "zustand/middleware";
import { isDemoMode } from "@/lib/demo-mode";
import {
    DEFAULT_METRICS_RANGE,
    DEFAULT_METRICS_REFRESH_MS,
    PROMETHEUS_RETENTION_MS,
} from "@/lib/prometheus";
import type { MetricBasis, MetricsRange } from "@/types/prometheus";

interface MetricsState {
    range: MetricsRange;
    refreshMs: number;
    cpuBasis: MetricBasis;
    memoryBasis: MetricBasis;
    setRange: (range: MetricsRange) => void;
    setRefreshMs: (refreshMs: number) => void;
    setCpuBasis: (basis: MetricBasis) => void;
    setMemoryBasis: (basis: MetricBasis) => void;
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
            candidate.durationMs > 0 &&
            candidate.durationMs <= PROMETHEUS_RETENTION_MS
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
            refreshMs: DEFAULT_METRICS_REFRESH_MS,
            cpuBasis: "server",
            memoryBasis: "server",
            setRange: (range) => set({ range }),
            setRefreshMs: (refreshMs) => set({ refreshMs }),
            setCpuBasis: (cpuBasis) => set({ cpuBasis }),
            setMemoryBasis: (memoryBasis) => set({ memoryBasis }),
        }),
        {
            name: isDemoMode() ? "metrics-preferences-demo" : "metrics-preferences",
            version: 1,
            partialize: (state) => ({
                range: state.range,
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
