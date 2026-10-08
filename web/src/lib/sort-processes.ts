import type { ProcessStatus, ProcessSummary } from '@/types/process'
import type { RegisteredServer } from '@/types/server'

export interface ProcessListItem {
  server: RegisteredServer
  process: ProcessSummary
}

export type ProcessSortKey = 'memory' | 'cpu' | 'host' | 'namespace' | 'pm_id'

// Severity order: unhealthy processes surface above healthy ones for triage.
export function getSeverityRank(pm2_env: {
  status: ProcessStatus
  autorestart?: boolean
  cron_restart?: string | null
  exit_code?: number | null
}): number {
  const { status, autorestart, cron_restart, exit_code } = pm2_env
  const isCronOrOneShot = autorestart === false || Boolean(cron_restart)

  switch (status) {
    // 1. CRITICAL: Unstable-restart limit exceeded; PM2 gave up
    case 'errored':
      return 1

    // 2. HIGH (or CRITICAL / IDLE depending on why it stopped)
    case 'stopped':
      if (isCronOrOneShot) {
        // Cron/One-shot crashed (non-zero exit code) -> Treat as Critical (Rank 2, right under errored)
        if (exit_code !== undefined && exit_code !== null && exit_code !== 0) {
          return 2
        }
        // Cron/One-shot finished normally (exit_code === 0) -> Not an issue! Push to Rank 6 (right above online)
        return 6
      }
      // Normal long-running service that is stopped -> High severity (Rank 3)
      return 3

    // 3. MEDIUM: Process exited; backoff/restart timer running
    case 'waiting restart':
      return 4

    // 4. INFO: Graceful stop or initial launch in progress
    case 'stopping':
    case 'launching':
      return 5

    // 5. NONE / LEGACY: Healthy online process (Bottom of the list)
    case 'online':
    case 'one-launch-status':
    default:
      return 7
  }
}

const SORT_WATERFALL: ProcessSortKey[] = ['memory', 'cpu', 'namespace', 'host', 'pm_id']

/** Stable identity for a process across servers; pm_id alone is only unique per server. */
export function processItemKey(item: ProcessListItem): string {
  return `${item.server.server}:${item.process.pm_id}`
}

const comparators: Record<ProcessSortKey, (a: ProcessListItem, b: ProcessListItem) => number> = {
  memory: (a, b) => b.process.memory - a.process.memory,
  cpu: (a, b) => b.process.cpu - a.process.cpu,
  host: (a, b) => a.server.host.localeCompare(b.server.host),
  namespace: (a, b) => a.process.namespace.localeCompare(b.process.namespace),
  pm_id: (a, b) => a.process.pm_id - b.process.pm_id,
}

/**
 * Orders the flat dashboard list by severity rank (see `getSeverityRank`),
 * then the chosen key, then the remaining waterfall keys (memory, CPU,
 * namespace, host, pm_id). Port and server name close the remaining ties, since
 * hosts and pm_ids can repeat across servers, so the order never shuffles
 * between refreshes.
 */
export function sortProcesses(
  items: readonly ProcessListItem[],
  primaryKey: ProcessSortKey = 'memory',
): ProcessListItem[] {
  const ordered = [primaryKey, ...SORT_WATERFALL.filter((key) => key !== primaryKey)]

  return items.toSorted((a, b) => {
    const byStatus = getSeverityRank(a.process) - getSeverityRank(b.process)
    if (byStatus !== 0) return byStatus

    for (const key of ordered) {
      const result = comparators[key](a, b)
      if (result !== 0) return result
    }

    const byPort = a.server.port - b.server.port
    if (byPort !== 0) return byPort

    return a.server.server.localeCompare(b.server.server)
  })
}
