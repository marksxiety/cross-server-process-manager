import { deriveEffectiveStatus } from '@/lib/process-status'
import type { ProcessListItem } from '@/lib/sort-processes'
import { STATUS_ORDER } from '@/lib/status-catalog'
import type { EffectiveStatus, ProcessSummary } from '@/types/process'

/** PM2 namespace reserved for the dashboard's own agent/server/web processes. */
export const XPM_NAMESPACE = 'XPM'

const XPM_NAMESPACE_LOWER = XPM_NAMESPACE.toLowerCase()

/** True when a PM2 namespace belongs to the XPM-owned namespace. */
export function isXpmNamespace(namespace: string | undefined): boolean {
  return (namespace ?? '').trim().toLowerCase() === XPM_NAMESPACE_LOWER
}

/** True when the process belongs to the XPM-owned namespace. */
export function isXpmProcess(
  process: Pick<ProcessSummary, 'namespace'>,
): boolean {
  return isXpmNamespace(process.namespace)
}

export interface PartitionedProcessItems {
  /** Everything the user owns; shown by default. */
  standard: ProcessListItem[]
  /** XPM-owned processes, hidden unless the user opts in. */
  xpm: ProcessListItem[]
}

/** Splits a flat process list by namespace while preserving the original order. */
export function partitionXpmProcesses(
  items: readonly ProcessListItem[],
): PartitionedProcessItems {
  const standard: ProcessListItem[] = []
  const xpm: ProcessListItem[] = []

  for (const item of items) {
    if (isXpmProcess(item.process)) xpm.push(item)
    else standard.push(item)
  }

  return { standard, xpm }
}

/**
 * Filters by process name or namespace, case-insensitively. An empty query
 * leaves the list untouched so refreshes never shuffle the result.
 */
export function filterProcessItemsByQuery(
  items: readonly ProcessListItem[],
  query: string,
): ProcessListItem[] {
  const normalized = query.trim().toLowerCase()
  if (normalized === '') return [...items]

  return items.filter(
    (item) =>
      item.process.name.toLowerCase().includes(normalized) ||
      item.process.namespace.toLowerCase().includes(normalized),
  )
}

/**
 * The Dashboard's process filters. `null` means the category is unrestricted;
 * an array restricts it to the listed values. An empty array is a deliberate
 * "nothing selected" state, so it yields no processes until reset.
 */
export interface ProcessFilters {
  servers: string[] | null
  namespaces: string[] | null
  statuses: EffectiveStatus[] | null
}

export const DEFAULT_PROCESS_FILTERS: ProcessFilters = {
  servers: null,
  namespaces: null,
  statuses: null,
}

function sanitizeStringFilter(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  return [
    ...new Set(
      value.filter(
        (entry): entry is string =>
          typeof entry === 'string' && entry.trim() !== '',
      ),
    ),
  ]
}

function isEffectiveStatus(value: unknown): value is EffectiveStatus {
  return (
    typeof value === 'string' &&
    (STATUS_ORDER as readonly string[]).includes(value)
  )
}

function sanitizeStatusFilter(value: unknown): EffectiveStatus[] | null {
  if (!Array.isArray(value)) return null
  return [...new Set(value.filter(isEffectiveStatus))]
}

/** Restores a persisted filter object, falling back to "all" per category. */
export function sanitizeProcessFilters(value: unknown): ProcessFilters {
  const filters =
    typeof value === 'object' && value !== null
      ? (value as Partial<Record<keyof ProcessFilters, unknown>>)
      : {}

  return {
    servers: sanitizeStringFilter(filters.servers),
    namespaces: sanitizeStringFilter(filters.namespaces),
    statuses: sanitizeStatusFilter(filters.statuses),
  }
}

function toSelectionSet<T>(selection: readonly T[] | null): Set<T> | null {
  return selection === null ? null : new Set(selection)
}

/**
 * Applies the selected servers, namespaces and effective statuses. Values
 * within a category are ORed; categories are ANDed. A null category matches
 * everything, and an empty category matches nothing.
 */
export function filterProcessItems(
  items: readonly ProcessListItem[],
  filters: ProcessFilters,
): ProcessListItem[] {
  const servers = toSelectionSet(filters.servers)
  const namespaces = toSelectionSet(filters.namespaces)
  const statuses = toSelectionSet(filters.statuses)

  if (servers === null && namespaces === null && statuses === null) {
    return [...items]
  }

  return items.filter(
    (item) =>
      (servers === null || servers.has(item.server.server)) &&
      (namespaces === null || namespaces.has(item.process.namespace)) &&
      (statuses === null ||
        statuses.has(deriveEffectiveStatus(item.process))),
  )
}

/**
 * Toggles one option. A null selection starts from "all selected". Selecting
 * every available option collapses back to null; deselecting the last option
 * keeps an empty selection so the list can intentionally show nothing.
 */
export function toggleProcessFilterValue<T>(
  selected: readonly T[] | null,
  value: T,
  options: readonly T[],
): T[] | null {
  const current = new Set(selected ?? options)

  if (current.has(value)) current.delete(value)
  else current.add(value)

  const next = options.filter((option) => current.has(option))
  return next.length === options.length ? null : next
}

/** Number of filter categories currently narrowing the process list. */
export function countActiveProcessFilters(filters: ProcessFilters): number {
  return [filters.servers, filters.namespaces, filters.statuses].filter(
    (selection) => selection !== null,
  ).length
}
