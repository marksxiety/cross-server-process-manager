import type { ProcessStatus, ProcessSummary } from '@/types/process'
import type { RegisteredServer } from '@/types/server'

export interface ProcessListItem {
  server: RegisteredServer
  process: ProcessSummary
}

export type ProcessSortKey = 'memory' | 'cpu' | 'host' | 'namespace' | 'pm_id'

// Severity order: unhealthy processes surface above healthy ones for triage.
const STATUS_RANK: Record<ProcessStatus, number> = {
  errored: 0,
  stopped: 1,
  stopping: 2,
  launching: 3,
  online: 4,
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
 * Orders the flat dashboard list: non-online statuses first in severity order,
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
    const byStatus = STATUS_RANK[a.process.status] - STATUS_RANK[b.process.status]
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
