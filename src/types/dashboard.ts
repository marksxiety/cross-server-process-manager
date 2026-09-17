import type { ProcessSummary } from "@/types/process";
import type { SystemOverview } from "@/types/system";

export type LoadStatus = "idle" | "loading" | "success" | "error";

export interface ServerProcesses {
    status: LoadStatus;
    processes: ProcessSummary[];
    overview: SystemOverview | null;
    error: string | null;
}
