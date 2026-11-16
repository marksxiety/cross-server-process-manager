export interface SystemOverview {
  cpu: {
    usagePercent: number;
    cores: number;
    /** Length of the CPU measurement window in milliseconds. */
    windowMs?: number | null;
  };
  memory: {
    totalBytes: number;
    freeBytes: number;
    usedBytes: number;
    percentUsed: number;
  };
  /** Unix timestamp (ms) of the host sample. */
  sampledAt?: number | null;
}
