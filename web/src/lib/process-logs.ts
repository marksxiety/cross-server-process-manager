import type { LogStream, ProcessLogLine, ProcessLogs } from "@/types/process";

/**
 * Matches the timestamp PM2 prepends when started with `time: true`:
 * `2026-09-19T10:29:08: message`. The prefix is fixed-width ISO, so sorting the
 * captured strings lexicographically is equivalent to sorting chronologically —
 * no `Date` parsing (and no timezone guesswork) required.
 */
const TIMESTAMP_RE = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?):\s?([\s\S]*)$/;

const STREAMS: LogStream[] = ["out", "error"];

/**
 * Merges the `out` and `error` streams into a single timeline ordered by the
 * PM2 timestamp prefix. PM2 only stamps the first line of a write, so any
 * following line without a timestamp inherits the timestamp of the line before
 * it within the same stream.
 */
export function mergeProcessLogs(logs: ProcessLogs | null | undefined): ProcessLogLine[] {
    const merged: ProcessLogLine[] = [];
    let id = 0;

    for (const stream of STREAMS) {
        let lastTimestamp: string | null = null;

        for (const line of logs?.[stream] ?? []) {
            const match = TIMESTAMP_RE.exec(line);

            if (match) {
                lastTimestamp = match[1]!;
            }

            merged.push({
                id: id++,
                stream,
                timestamp: match ? match[1]! : lastTimestamp,
                message: match ? match[2]! : line,
            });
        }
    }

    return merged.sort((a, b) => (a.timestamp ?? "").localeCompare(b.timestamp ?? ""));
}
