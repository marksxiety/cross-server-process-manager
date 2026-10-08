import type { EffectiveStatus, ProcessSummary } from "@/types/process";

/** Wire statuses are untrusted agent data, so any string is accepted. */
export type EffectiveStatusInput =
    | string
    | Pick<ProcessSummary, "status" | "autorestart" | "cron_restart" | "exit_code">;

const FALLBACK_STATUS: EffectiveStatus = "stopped_manual";

/**
 * Maps PM2 wire statuses to the UI's derived status vocabulary. Effective
 * statuses pass through so the helper stays correct once the agent starts
 * deriving them server-side.
 */
const EFFECTIVE_STATUS_BY_WIRE_VALUE = new Map<string, EffectiveStatus>([
    ["online", "online"],
    ["errored", "errored"],
    ["stopped", "stopped_manual"],
    ["stopping", "transitioning"],
    ["launching", "transitioning"],
    ["one-launch-status", "transitioning"],
    ["waiting restart", "waiting_restart"],
    ["unknown", "stopped_manual"],
    ["failed_exit", "failed_exit"],
    ["degraded", "degraded"],
    ["waiting_restart", "waiting_restart"],
    ["transitioning", "transitioning"],
    ["stopped_manual", "stopped_manual"],
    ["scheduled_idle", "scheduled_idle"],
    ["completed", "completed"],
]);

function mapWireStatus(status: string): EffectiveStatus {
    return EFFECTIVE_STATUS_BY_WIRE_VALUE.get(status.trim().toLowerCase()) ?? FALLBACK_STATUS;
}

function hasNonZeroExitCode(exitCode: number | null | undefined): boolean {
    return exitCode !== undefined && exitCode !== null && exitCode !== 0;
}

/**
 * PM2 reports every exit as `stopped`; the reason (crash, finished one-shot,
 * cron idle, manual stop) only exists in the surrounding pm2_env fields.
 * Windows manual stops exit non-zero (`taskkill`), so a non-zero code alone
 * cannot mean "crashed" — only one-shot jobs (`autorestart: false`) are
 * treated as failures; a long-running service left stopped was stopped
 * manually.
 */
function deriveStoppedStatus(
    process: Pick<ProcessSummary, "autorestart" | "cron_restart" | "exit_code">,
): EffectiveStatus {
    const isOneShot = process.autorestart === false;
    if (isOneShot && hasNonZeroExitCode(process.exit_code)) return "failed_exit";
    if (process.cron_restart) return "scheduled_idle";
    if (isOneShot && process.exit_code === 0) return "completed";
    return "stopped_manual";
}

export function deriveEffectiveStatus(
    input?: EffectiveStatusInput | null,
): EffectiveStatus {
    if (typeof input === "string") return mapWireStatus(input);
    if (input) {
        if (input.status === "stopped") return deriveStoppedStatus(input);
        return mapWireStatus(input.status);
    }
    return FALLBACK_STATUS;
}
