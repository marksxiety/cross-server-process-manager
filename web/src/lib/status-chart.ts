import type { EffectiveStatus } from "@/types/process";

/**
 * Chart-friendly status colors. These mirror the Tailwind tones in
 * `status-styles.ts` so the timeline and the dashboard badges agree.
 */
export const STATUS_CHART_COLORS: Record<EffectiveStatus, string> = {
    errored: "#ef4444",
    failed_exit: "#f43f5e",
    degraded: "#f97316",
    waiting_restart: "#f59e0b",
    transitioning: "#0ea5e9",
    stopped_manual: "#64748b",
    scheduled_idle: "#8b5cf6",
    completed: "#14b8a6",
    online: "#10b981",
    unknown: "#94a3b8",
};
