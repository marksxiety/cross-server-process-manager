export interface SystemOverview {
  cpu: { cores: number; model: string; loadAvg: [number, number, number] }
  memory: { totalBytes: number; freeBytes: number; usedBytes: number; percentUsed: number }
}