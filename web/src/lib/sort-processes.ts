import { deriveEffectiveStatus } from '@/lib/process-status'
import type { EffectiveStatusInput } from '@/lib/process-status'
import { STATUS_CATALOG } from '@/lib/status-catalog'
import type { ProcessSummary } from '@/types/process'
import type { RegisteredServer } from '@/types/server'

export interface ProcessListItem {
  server: RegisteredServer
  process: ProcessSummary
}

/**
 * The keys the user can sort by, in menu order. `status` is pinned to the
 * first position: when selected it always outranks every other key (see
 * `sortProcesses`), but it can be unchecked and rechecked like any other.
 */
export const SORT_KEYS = [
  'status',
  'name',
  'restarts',
  'memory',
  'cpu',
  'uptime',
  'host',
  'namespace',
  'pm_id',
] as const

export type ProcessSortKey = (typeof SORT_KEYS)[number]

// Severity order: unhealthy processes surface above healthy ones for triage.
// Ranks come from the shared status catalog so sorting matches the Dashboard
// labels and the metrics chart order.
export function getSeverityRank(input: EffectiveStatusInput): number {
  return STATUS_CATALOG[deriveEffectiveStatus(input)].rank
}

export const DEFAULT_SORT_ORDER: readonly ProcessSortKey[] = [
  'memory',
  'cpu',
  'namespace',
  'host',
  'pm_id',
]

/** True when `value` is a key a stored sort order may contain. */
export function isProcessSortKey(value: unknown): value is ProcessSortKey {
  return (
    typeof value === 'string' &&
    (SORT_KEYS as readonly string[]).includes(value)
  )
}

/**
 * Sanitizes a persisted sort order: non-arrays become the default (empty) order
 * and only known keys survive, deduplicated. Used when rehydrating the store.
 */
export function sanitizeSortOrder(value: unknown): ProcessSortKey[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter(isProcessSortKey))]
}

/** Stable identity for a process across servers; pm_id alone is only unique per server. */
export function processItemKey(item: ProcessListItem): string {
  return `${item.server.server}:${item.process.pm_id}`
}

const comparators: Record<ProcessSortKey, (a: ProcessListItem, b: ProcessListItem) => number> = {
  // Lower severity rank means more unhealthy (errored first, online last).
  status: (a, b) => getSeverityRank(a.process) - getSeverityRank(b.process),
  name: (a, b) => a.process.name.localeCompare(b.process.name),
  restarts: (a, b) => b.process.restarts - a.process.restarts,
  memory: (a, b) => b.process.memory - a.process.memory,
  cpu: (a, b) => b.process.cpu - a.process.cpu,
  uptime: (a, b) => b.process.uptime - a.process.uptime,
  host: (a, b) => a.server.host.localeCompare(b.server.host),
  namespace: (a, b) => a.process.namespace.localeCompare(b.process.namespace),
  pm_id: (a, b) => a.process.pm_id - b.process.pm_id,
}

/**
 * Orders the flat dashboard list by `status` first when it is selected (see
 * `getSeverityRank`), so unhealthy processes are grouped above healthy ones.
 * `status` is pinned: wherever it sits in the chosen order, it always sorts
 * first, though it can be unchecked to disable the grouping. Then applies the
 * criteria in the user's chosen order, then any remaining keys from
 * `DEFAULT_SORT_ORDER` as tie-breakers. An empty order falls back to the
 * default waterfall (memory first). Port and server name close the remaining
 * ties, since hosts and pm_ids can repeat across servers, so the order never
 * shuffles between refreshes.
 */
export function sortProcesses(
  items: readonly ProcessListItem[],
  sortOrder: readonly ProcessSortKey[] = DEFAULT_SORT_ORDER,
): ProcessListItem[] {
  const ordered = [
    ...(sortOrder.includes('status') ? (['status'] as const) : []),
    ...new Set(sortOrder.filter((key) => key !== 'status')),
    ...DEFAULT_SORT_ORDER.filter((key) => !sortOrder.includes(key)),
  ]

  return items.toSorted((a, b) => {
    for (const key of ordered) {
      const result = comparators[key](a, b)
      if (result !== 0) return result
    }

    const byPort = a.server.port - b.server.port
    if (byPort !== 0) return byPort

    return a.server.server.localeCompare(b.server.server)
  })
}
