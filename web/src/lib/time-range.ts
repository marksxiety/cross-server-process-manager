import { formatUptime } from "@/lib/format";
import { findRangePreset } from "@/lib/prometheus";
import type { MetricsRange } from "@/types/prometheus";

export const MIN_CUSTOM_RANGE_MS = 60_000;

const RANGE_DATE_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
});

/** Formats a timestamp for a local `datetime-local` input. */
export function toLocalDateTimeInput(timestamp: number): string {
    const offset = new Date(timestamp).getTimezoneOffset() * 60_000;
    return new Date(timestamp - offset).toISOString().slice(0, 16);
}

/** Parses a local `datetime-local` input value into a timestamp. */
export function parseLocalDateTimeInput(value: string): number | null {
    if (value === "") return null;

    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
}

export function formatRangeDateTime(timestamp: number): string {
    return RANGE_DATE_TIME_FORMATTER.format(timestamp);
}

/** The label shown on the closed range control. */
export function formatRangeLabel(range: MetricsRange): string {
    if (range.kind === "relative") {
        return (
            findRangePreset(range.durationMs)?.label ??
            `Last ${formatUptime(range.durationMs)}`
        );
    }

    return `${formatRangeDateTime(range.start)} – ${formatRangeDateTime(range.end)}`;
}

/** Returns the user-facing validation message, or null for a valid range. */
export function validateCustomRange(
    from: number | null,
    to: number | null,
    now: number,
): string | null {
    if (from === null || to === null) {
        return "Enter both a start and an end.";
    }

    if (from >= to) {
        return "The start must be before the end.";
    }

    if (to - from < MIN_CUSTOM_RANGE_MS) {
        return "Choose a range of at least one minute.";
    }

    if (to > now) {
        return "The end cannot be in the future.";
    }

    return null;
}
