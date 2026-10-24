import { Check, Clock, Pause, RefreshCw, TriangleAlert, type LucideIcon } from "lucide-react";
import { deriveEffectiveStatus } from "@/lib/process-status";
import type { EffectiveStatusInput } from "@/lib/process-status";
import { STATUS_CATALOG, STATUS_ORDER } from "@/lib/status-catalog";
import type { EffectiveStatus, ProcessSummary } from "@/types/process";

export type StatusSeverity =
    | "calm"
    | "neutral"
    | "watch"
    | "notice"
    | "critical";

export type StatusVisual = {
    label: string;
    icon: LucideIcon;
    severity: StatusSeverity;
    dot: string;
    pulse: boolean;
    text: string;
    surface: string;
    border: string;
    ring: string;
    badge: string;
};

type StatusVisualStyle = Omit<StatusVisual, "label">

const STATUS_VISUAL_STYLES: Record<EffectiveStatus, StatusVisualStyle> = {
    errored: {
        icon: TriangleAlert,
        severity: "critical",
        dot: "bg-status-errored",
        pulse: true,
        text: "text-status-errored-text",
        surface: "bg-status-errored-surface",
        border: "border-status-errored-border",
        ring: "ring-status-errored-border",
        badge: "bg-card border-status-errored-border text-status-errored-text",
    },
    failed_exit: {
        icon: TriangleAlert,
        severity: "critical",
        dot: "bg-status-failed-exit",
        pulse: true,
        text: "text-status-failed-exit-text",
        surface: "bg-status-failed-exit-surface",
        border: "border-status-failed-exit-border",
        ring: "ring-status-failed-exit-border",
        badge: "bg-card border-status-failed-exit-border text-status-failed-exit-text",
    },
    degraded: {
        icon: TriangleAlert,
        severity: "notice",
        dot: "bg-status-degraded",
        pulse: true,
        text: "text-status-degraded-text",
        surface: "bg-status-degraded-surface",
        border: "border-status-degraded-border",
        ring: "ring-status-degraded-border",
        badge: "bg-card border-status-degraded-border text-status-degraded-text",
    },
    waiting_restart: {
        icon: RefreshCw,
        severity: "notice",
        dot: "bg-status-waiting-restart",
        pulse: true,
        text: "text-status-waiting-restart-text",
        surface: "bg-status-waiting-restart-surface",
        border: "border-status-waiting-restart-border",
        ring: "ring-status-waiting-restart-border",
        badge: "bg-card border-status-waiting-restart-border text-status-waiting-restart-text",
    },
    transitioning: {
        icon: RefreshCw,
        severity: "notice",
        dot: "bg-status-transitioning",
        pulse: true,
        text: "text-status-transitioning-text",
        surface: "bg-status-transitioning-surface",
        border: "border-status-transitioning-border",
        ring: "ring-status-transitioning-border",
        badge: "bg-card border-status-transitioning-border text-status-transitioning-text",
    },
    stopped_manual: {
        icon: Pause,
        severity: "neutral",
        dot: "bg-status-stopped-manual",
        pulse: false,
        text: "text-status-stopped-manual-text",
        surface: "bg-status-stopped-manual-surface",
        border: "border-status-stopped-manual-border",
        ring: "ring-status-stopped-manual-border",
        badge: "bg-card border-status-stopped-manual-border text-status-stopped-manual-text",
    },
    scheduled_idle: {
        icon: Clock,
        severity: "calm",
        dot: "bg-status-scheduled-idle",
        pulse: false,
        text: "text-status-scheduled-idle-text",
        surface: "bg-status-scheduled-idle-surface",
        border: "border-status-scheduled-idle-border",
        ring: "ring-status-scheduled-idle-border",
        badge: "bg-card border-status-scheduled-idle-border text-status-scheduled-idle-text",
    },
    completed: {
        icon: Check,
        severity: "calm",
        dot: "bg-status-completed",
        pulse: false,
        text: "text-status-completed-text",
        surface: "bg-status-completed-surface",
        border: "border-status-completed-border",
        ring: "ring-status-completed-border",
        badge: "bg-card border-status-completed-border text-status-completed-text",
    },
    online: {
        icon: Check,
        severity: "calm",
        dot: "bg-status-online",
        pulse: false,
        text: "text-status-online-text",
        surface: "bg-status-online-surface",
        border: "border-status-online-border",
        ring: "ring-status-online-border",
        badge: "bg-card border-status-online-border text-status-online-text",
    },
    unknown: {
        icon: TriangleAlert,
        severity: "watch",
        dot: "bg-status-unknown",
        pulse: false,
        text: "text-status-unknown-text",
        surface: "bg-status-unknown-surface",
        border: "border-status-unknown-border",
        ring: "ring-status-unknown-border",
        badge: "bg-card border-status-unknown-border text-status-unknown-text",
    },
};

export const STATUS_VISUALS = Object.fromEntries(
    STATUS_ORDER.map((status) => [
        status,
        {
            label: STATUS_CATALOG[status].label,
            ...STATUS_VISUAL_STYLES[status],
        },
    ]),
) as Record<EffectiveStatus, StatusVisual>;

export function getStatusVisual(
    input?: EffectiveStatusInput | null,
): StatusVisual {
    return STATUS_VISUALS[deriveEffectiveStatus(input)];
}

type StatusContextInput = Pick<
    ProcessSummary,
    "status" | "autorestart" | "cron_restart" | "exit_code"
>;

/** One-line explanation of what happened, shown under the sheet header. */
export function getStatusContext(process: StatusContextInput): string | null {
    switch (deriveEffectiveStatus(process)) {
        case "online":
            return null;
        case "errored":
            return "Crashed repeatedly — PM2 stopped restarting";
        case "failed_exit":
            return process.exit_code !== undefined && process.exit_code !== null
                ? `Crashed with exit code ${process.exit_code}`
                : "Crashed with a non-zero exit code";
        case "waiting_restart":
            return "Crashed — PM2 will restart it shortly";
        case "stopped_manual":
            return "Stopped manually";
        case "completed":
            return "Finished cleanly (exit 0)";
        case "scheduled_idle":
            return process.cron_restart
                ? `Waiting for the next run (${process.cron_restart})`
                : "Waiting for the next run";
        case "transitioning":
            return "Starting or stopping right now";
        case "degraded":
            return "Some instances are down";
        case "unknown":
            return "Status unavailable";
    }
}
