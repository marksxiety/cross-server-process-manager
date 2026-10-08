import type { ProcessCommand, ProcessCommandTarget, ProcessStatus } from "@/types/process";

/** Interpreters whose basename identifies a Node.js runtime. */
const NODE_INTERPRETER_BASENAMES = new Set(["node", "node.exe"]);

function interpreterBasename(interpreter: string): string {
    const segments = interpreter.split(/[\\/]/);
    return (segments[segments.length - 1] ?? "").trim().toLowerCase();
}

/** Wire statuses where a command is already in progress. */
export function isTransientProcessStatus(status: ProcessStatus): boolean {
    return status === "stopping" || status === "launching" || status === "one-launch-status";
}

/**
 * True when the process runs Node.js in PM2 cluster mode — the only
 * combination where `pm2 reload` gives a zero-downtime rolling update.
 */
export function isNodeClusterProcess(
    process: Pick<ProcessCommandTarget, "interpreter" | "exec_mode">,
): boolean {
    return (
        NODE_INTERPRETER_BASENAMES.has(interpreterBasename(process.interpreter)) &&
        process.exec_mode === "cluster_mode"
    );
}

/**
 * Whether a lifecycle command is allowed for the process's current state.
 * Shared by the dashboard UI (show/disable) and the store (guard before the
 * agent call) so the two can never disagree.
 */
export function canRunProcessCommand(
    process: ProcessCommandTarget,
    command: ProcessCommand,
): boolean {
    if (isTransientProcessStatus(process.status)) {
        return command === "delete";
    }

    switch (command) {
        case "start":
            return process.status !== "online";
        case "stop":
            return process.status === "online";
        case "restart":
            return true;
        case "reload":
            return process.status === "online" && isNodeClusterProcess(process);
        case "delete":
            return true;
    }
}
