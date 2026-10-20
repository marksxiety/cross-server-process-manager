export interface SystemOverview {
  cpu: { usagePercent: number; cores: number }
  memory: { totalBytes: number; freeBytes: number; usedBytes: number; percentUsed: number }
}