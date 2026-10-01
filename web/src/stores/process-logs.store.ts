import { create } from "zustand";
import { processService } from "@/api/services/process.service";
import { toApiError, toUnreachableError } from "@/lib/error-code";
import { mergeProcessLogs } from "@/lib/process-logs";
import { isCacheFresh } from "@/lib/swr";
import type { ApiError } from "@/types/api";
import type { LoadStatus } from "@/types/dashboard";
import type { ProcessLogLine } from "@/types/process";
import type { RegisteredServer } from "@/types/server";

export const LOGS_DEFAULT_TAIL = 50;
export const LOGS_TAIL_OPTIONS = [10, 50, 100] as const;

export function logKey(server: RegisteredServer, pmId: number): string {
    return `${server.protocol}://${server.host}:${server.port}/${pmId}`;
}

export interface LogsEntry {
    status: LoadStatus;
    lines: ProcessLogLine[];
    requestError: ApiError | null;
    tail: number;
    fetchedAt: number | null;
    refreshing: boolean;
}

interface ProcessLogsState {
    entries: Record<string, LogsEntry>;
    /** SWR entry action: shows the in-memory timeline immediately and only refetches when stale. */
    load: (server: RegisteredServer, pmId: number, tail?: number) => Promise<void>;
    /** Forces a refetch, keeping the current lines visible while it resolves. */
    refresh: (server: RegisteredServer, pmId: number) => Promise<void>;
    /** Changes the tail and swaps the timeline once the new lines arrive (no spinner). */
    setTail: (server: RegisteredServer, pmId: number, tail: number) => Promise<void>;
}

export const useProcessLogsStore = create<ProcessLogsState>()((set, get) => {
    // Monotonic per-key token so a superseded response can never overwrite a newer one.
    const requestSeq = new Map<string, number>();

    async function fetchEntry(
        server: RegisteredServer,
        pmId: number,
        tail: number,
        mode: "initial" | "silent"
    ): Promise<void> {
        const key = logKey(server, pmId);
        const token = (requestSeq.get(key) ?? 0) + 1;
        requestSeq.set(key, token);

        set((state) => {
            const previous = state.entries[key];
            return {
                entries: {
                    ...state.entries,
                    [key]: {
                        status: mode === "initial" ? "loading" : previous?.status ?? "success",
                        lines: previous?.lines ?? [],
                        requestError: previous?.requestError ?? null,
                        tail,
                        fetchedAt: previous?.fetchedAt ?? null,
                        refreshing: mode === "silent",
                    },
                },
            };
        });

        let next: LogsEntry;

        try {
            const result = await processService(server).logs(pmId, { tail });
            if (requestSeq.get(key) !== token) return;

            if (!result.success || !result.info) {
                const previous = get().entries[key];
                next = {
                    status: "error",
                    lines: previous?.lines ?? [],
                    requestError: toApiError(result),
                    tail,
                    fetchedAt: Date.now(),
                    refreshing: false,
                };
            } else {
                next = {
                    status: "success",
                    lines: mergeProcessLogs(result.info),
                    requestError: null,
                    tail,
                    fetchedAt: Date.now(),
                    refreshing: false,
                };
            }
        } catch (cause) {
            if (requestSeq.get(key) !== token) return;
            const previous = get().entries[key];
            next = {
                status: "error",
                lines: previous?.lines ?? [],
                requestError: toUnreachableError(cause),
                tail,
                fetchedAt: Date.now(),
                refreshing: false,
            };
        }

        set((state) => ({ entries: { ...state.entries, [key]: next } }));
    }

    return {
        entries: {},

        load: async (server, pmId, tail) => {
            const key = logKey(server, pmId);
            const entry = get().entries[key];
            const nextTail = tail ?? entry?.tail ?? LOGS_DEFAULT_TAIL;

            if (entry && entry.tail === nextTail) {
                // Fresh success in memory: render as-is, no request.
                if (entry.status === "success" && isCacheFresh(entry.fetchedAt)) return;
                // Stale (or errored): refresh in the background without a spinner.
                await fetchEntry(server, pmId, nextTail, entry.lines.length > 0 ? "silent" : "initial");
                return;
            }

            await fetchEntry(server, pmId, nextTail, "initial");
        },

        refresh: async (server, pmId) => {
            const entry = get().entries[logKey(server, pmId)];
            await fetchEntry(server, pmId, entry?.tail ?? LOGS_DEFAULT_TAIL, entry && entry.lines.length > 0 ? "silent" : "initial");
        },

        setTail: async (server, pmId, tail) => {
            const entry = get().entries[logKey(server, pmId)];
            await fetchEntry(server, pmId, tail, entry && entry.lines.length > 0 ? "silent" : "initial");
        },
    };
});
