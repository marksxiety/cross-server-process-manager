export interface SystemOverview {
  cpu: { usagePercent: number }
  memory: { totalBytes: number; freeBytes: number; usedBytes: number; percentUsed: number }
}