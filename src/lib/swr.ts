export const SWR_MAX_AGE_MS = 30_000;
export const DASHBOARD_AUTO_REFRESH_MS = 60_000;

export function isCacheFresh(lastFetchedAt: number | null, maxAgeMs = SWR_MAX_AGE_MS): boolean {
    if (lastFetchedAt === null) return false;
    return Date.now() - lastFetchedAt < maxAgeMs;
}
