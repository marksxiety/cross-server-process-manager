import type { LoadStatus } from '@/types/dashboard'

export interface UsageShares {
  pm2: number
  other: number
  /**
   * True when the PM2 estimate is larger than the host reading. The split then
   * cannot be reconciled; callers should surface the discrepancy instead of
   * presenting the PM2 value as the host total.
   */
  exceedsHost: boolean
}

export type UsageStatus = 'loading' | 'ready' | 'empty' | 'error'

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, value))
}

export function cpuUsageShares(
  pm2CpuPercent: number | null,
  hostCpuPercent: number | null,
  cores: number | null,
): UsageShares | null {
  if (pm2CpuPercent === null || !Number.isFinite(pm2CpuPercent)) return null
  if (cores === null || !Number.isFinite(cores) || cores <= 0) return null

  const pm2 = clampPercent(pm2CpuPercent / cores)
  const host = clampPercent(hostCpuPercent ?? 0)
  const exceedsHost =
    hostCpuPercent !== null && Number.isFinite(hostCpuPercent) && pm2 > host
  const other = exceedsHost
    ? 0
    : Math.min(clampPercent(host - pm2), Math.max(0, 100 - pm2))

  return { pm2, other, exceedsHost }
}

export function serverCpuShare(
  cpuPercentOfOneCore: number,
  cores: number | null,
): number | null {
  if (!Number.isFinite(cpuPercentOfOneCore)) return null
  if (cores === null || !Number.isFinite(cores) || cores <= 0) return null

  return clampPercent(cpuPercentOfOneCore / cores)
}

export function memoryUsageShares(
  pm2Bytes: number | null,
  hostUsedBytes: number | null,
  hostTotalBytes: number | null,
): UsageShares | null {
  if (pm2Bytes === null || !Number.isFinite(pm2Bytes)) return null
  if (
    hostTotalBytes === null ||
    !Number.isFinite(hostTotalBytes) ||
    hostTotalBytes <= 0
  ) {
    return null
  }

  const used =
    hostUsedBytes !== null && Number.isFinite(hostUsedBytes)
      ? hostUsedBytes
      : null
  const pm2 = clampPercent((pm2Bytes / hostTotalBytes) * 100)
  const hostUsedPercent =
    used === null ? null : clampPercent((used / hostTotalBytes) * 100)
  const exceedsHost = hostUsedPercent !== null && pm2 > hostUsedPercent
  const other =
    hostUsedPercent === null || exceedsHost
      ? 0
      : Math.min(
          clampPercent(hostUsedPercent - pm2),
          Math.max(0, 100 - pm2),
        )

  return { pm2, other, exceedsHost }
}

export function resolveUsageStatus(
  overviewStatus: LoadStatus,
  metricStatus: LoadStatus,
  shares: UsageShares | null,
): UsageStatus {
  if (overviewStatus === 'error' || metricStatus === 'error') {
    return 'error'
  }

  if (
    overviewStatus === 'idle' ||
    overviewStatus === 'loading' ||
    metricStatus === 'idle' ||
    metricStatus === 'loading'
  ) {
    return 'loading'
  }

  if (shares === null) {
    return 'empty'
  }

  return 'ready'
}

export function formatUsagePercent(value: number): string {
  const safe = Number.isFinite(value) ? Math.max(0, value) : 0
  return `${safe < 1 ? safe.toFixed(2) : safe.toFixed(1)}%`
}
