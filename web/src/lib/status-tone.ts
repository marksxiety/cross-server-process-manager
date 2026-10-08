import type { ServerProcesses } from "@/types/dashboard";
import type { Tone } from "@/types/tone";

const PERCENT_WARNING_THRESHOLD = 70;
const PERCENT_DANGER_THRESHOLD = 90;
const PROCESS_CPU_WARNING_THRESHOLD = 80;

export const toneIconClasses: Record<Tone, string> = {
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    danger: "bg-destructive/10 text-destructive",
    neutral: "bg-muted text-muted-foreground",
};

export const toneTextClasses: Record<Tone, string> = {
    success: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
    danger: "text-destructive",
    neutral: "text-muted-foreground",
};

export const toneSurfaceClasses: Record<Tone, string> = {
    success: "bg-emerald-500/10",
    warning: "bg-amber-500/10",
    danger: "bg-destructive/10",
    neutral: "bg-muted",
};

export const toneProgressClasses: Record<Tone, string> = {
    success: "**:data-[slot=progress-indicator]:bg-emerald-500",
    warning: "**:data-[slot=progress-indicator]:bg-amber-500",
    danger: "**:data-[slot=progress-indicator]:bg-destructive",
    neutral: "**:data-[slot=progress-indicator]:bg-muted-foreground/40",
};

export function percentTone(value: number): Tone {
    if (value >= PERCENT_DANGER_THRESHOLD) return "danger";
    if (value >= PERCENT_WARNING_THRESHOLD) return "warning";
    return "success";
}

export function serverTone(entry: ServerProcesses | undefined): Tone {
    if (!entry || entry.status === "loading" || entry.status === "idle") return "neutral";
    if (entry.status === "error") return "danger";

    const memoryTone = entry.overview ? percentTone(entry.overview.memory.percentUsed) : "success";

    if (entry.processes.some((process) => process.status === "errored")) return "danger";
    if (memoryTone === "danger") return "danger";
    if (entry.processes.some((process) => process.cpu > PROCESS_CPU_WARNING_THRESHOLD)) return "warning";
    if (memoryTone === "warning") return "warning";
    return "success";
}
