import { Check, Clock, Pause, RefreshCw, TriangleAlert, type LucideIcon } from "lucide-react";
import { deriveEffectiveStatus } from "@/lib/process-status";
import type { EffectiveStatusInput } from "@/lib/process-status";
import type { EffectiveStatus, ProcessSummary } from "@/types/process";

export type StatusVisual = {
    label: string;
    icon: LucideIcon;
    dot: string;
    pulse: boolean;
    text: string;
    surface: string;
    border: string;
    ring: string;
};

export const STATUS_VISUALS: Record<EffectiveStatus, StatusVisual> = {
    errored: {
        label: "Errored",
        icon: TriangleAlert,
        dot: "bg-red-500",
        pulse: true,
        text: "text-red-700 dark:text-red-400",
        surface: "bg-red-50 dark:bg-red-950",
        border: "border-red-200 dark:border-red-800",
        ring: "ring-red-200 dark:ring-red-800",
    },
    failed_exit: {
        label: "Failed (Exit ≠ 0)",
        icon: TriangleAlert,
        dot: "bg-rose-500",
        pulse: true,
        text: "text-rose-700 dark:text-rose-400",
        surface: "bg-rose-50 dark:bg-rose-950",
        border: "border-rose-200 dark:border-rose-800",
        ring: "ring-rose-200 dark:ring-rose-800",
    },
    degraded: {
        label: "Degraded",
        icon: TriangleAlert,
        dot: "bg-orange-500",
        pulse: true,
        text: "text-orange-700 dark:text-orange-400",
        surface: "bg-orange-50 dark:bg-orange-950",
        border: "border-orange-200 dark:border-orange-800",
        ring: "ring-orange-200 dark:ring-orange-800",
    },
    waiting_restart: {
        label: "Waiting Restart",
        icon: RefreshCw,
        dot: "bg-amber-500",
        pulse: true,
        text: "text-amber-700 dark:text-amber-400",
        surface: "bg-amber-50 dark:bg-amber-950",
        border: "border-amber-200 dark:border-amber-800",
        ring: "ring-amber-200 dark:ring-amber-800",
    },
    transitioning: {
        label: "Launching / Stopping",
        icon: RefreshCw,
        dot: "bg-sky-500",
        pulse: true,
        text: "text-sky-700 dark:text-sky-400",
        surface: "bg-sky-50 dark:bg-sky-950",
        border: "border-sky-200 dark:border-sky-800",
        ring: "ring-sky-200 dark:ring-sky-800",
    },
    stopped_manual: {
        label: "Stopped",
        icon: Pause,
        dot: "bg-slate-500",
        pulse: false,
        text: "text-slate-700 dark:text-slate-400",
        surface: "bg-slate-100 dark:bg-slate-800",
        border: "border-slate-300 dark:border-slate-700",
        ring: "ring-slate-300 dark:ring-slate-700",
    },
    scheduled_idle: {
        label: "Scheduled (Idle)",
        icon: Clock,
        dot: "bg-violet-500",
        pulse: false,
        text: "text-violet-700 dark:text-violet-400",
        surface: "bg-violet-50 dark:bg-violet-950",
        border: "border-violet-200 dark:border-violet-900",
        ring: "ring-violet-200 dark:ring-violet-900",
    },
    completed: {
        label: "Completed",
        icon: Check,
        dot: "bg-teal-500",
        pulse: false,
        text: "text-teal-700 dark:text-teal-400",
        surface: "bg-teal-50 dark:bg-teal-950",
        border: "border-teal-200 dark:border-teal-800",
        ring: "ring-teal-200 dark:ring-teal-800",
    },
    online: {
        label: "Online",
        icon: Check,
        dot: "bg-emerald-500",
        pulse: false,
        text: "text-emerald-700 dark:text-emerald-400",
        surface: "bg-emerald-50 dark:bg-emerald-950",
        border: "border-emerald-200 dark:border-emerald-800",
        ring: "ring-emerald-200 dark:ring-emerald-800",
    },
};

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
    }
}
