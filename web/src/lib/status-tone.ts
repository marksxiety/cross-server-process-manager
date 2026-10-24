import { serverCpuShare } from "@/lib/server-usage";
import type { ServerProcesses } from "@/types/dashboard";
import type { Tone } from "@/types/tone";

const PERCENT_WARNING_THRESHOLD = 70;
const PERCENT_DANGER_THRESHOLD = 90;
const SERVER_PROCESS_CPU_WARNING_THRESHOLD = 80;

export const toneIconClasses: Record<Tone, string> = {
    success: "bg-status-online-surface text-status-online-text",
    warning: "bg-status-waiting-restart-surface text-status-waiting-restart-text",
    danger: "bg-status-errored-surface text-status-errored-text",
    neutral: "bg-muted text-muted-foreground",
};

export const toneTextClasses: Record<Tone, string> = {
    success: "text-status-online-text",
    warning: "text-status-waiting-restart-text",
    danger: "text-status-errored-text",
    neutral: "text-muted-foreground",
};

export const toneSurfaceClasses: Record<Tone, string> = {
    success: "bg-status-online-surface",
    warning: "bg-status-waiting-restart-surface",
    danger: "bg-status-errored-surface",
    neutral: "bg-muted",
};

export const toneProgressClasses: Record<Tone, string> = {
    success: "**:data-[slot=progress-indicator]:bg-status-online",
    warning: "**:data-[slot=progress-indicator]:bg-status-waiting-restart",
    danger: "**:data-[slot=progress-indicator]:bg-status-errored",
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
    const cores = entry.overview?.cpu.cores ?? null;

    if (entry.processes.some((process) => process.status === "errored")) return "danger";
    if (memoryTone === "danger") return "danger";
    if (
        entry.processes.some((process) => {
            const share = serverCpuShare(process.cpu, cores);
            return share !== null && share >= SERVER_PROCESS_CPU_WARNING_THRESHOLD;
        })
    ) {
        return "warning";
    }
    if (memoryTone === "warning") return "warning";
    return "success";
}
