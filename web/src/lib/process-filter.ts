import type { ProcessListItem } from '@/lib/sort-processes'
import type { ProcessSummary } from '@/types/process'

/** PM2 namespace reserved for the dashboard's own agent/server/web processes. */
export const XPM_NAMESPACE = 'XPM'

const XPM_NAMESPACE_LOWER = XPM_NAMESPACE.toLowerCase()

/** True when the process belongs to the XPM-owned namespace. */
export function isXpmProcess(
  process: Pick<ProcessSummary, 'namespace'>,
): boolean {
  return process.namespace.trim().toLowerCase() === XPM_NAMESPACE_LOWER
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
