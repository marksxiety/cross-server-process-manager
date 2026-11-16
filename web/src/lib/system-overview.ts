import type { SystemOverview } from "@/types/system";

function toNumber(value: unknown): number {
    return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toNullableNumber(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toRecord(value: unknown): Record<string, unknown> {
    return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

export function toSystemOverview(value: unknown): SystemOverview {
    const overview = toRecord(value);
    const cpu = toRecord(overview.cpu);
    const memory = toRecord(overview.memory);

    return {
        cpu: {
            usagePercent: toNumber(cpu.usagePercent),
            cores: toNumber(cpu.cores),
            windowMs: toNullableNumber(cpu.windowMs),
        },
        memory: {
            totalBytes: toNumber(memory.totalBytes),
            freeBytes: toNumber(memory.freeBytes),
            usedBytes: toNumber(memory.usedBytes),
            percentUsed: toNumber(memory.percentUsed),
        },
        sampledAt: toNullableNumber(overview.sampledAt),
    };
}
