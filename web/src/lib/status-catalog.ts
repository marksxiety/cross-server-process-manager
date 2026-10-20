import type { EffectiveStatus } from '@/types/process'

export interface StatusDefinition {
  code: number
  label: string
  rank: number
}

/**
 * Canonical status contract shared by the Dashboard and the metrics charts.
 * The exporter must emit `code` as the `pm2_status` value.
 */
export const STATUS_CATALOG: Record<EffectiveStatus, StatusDefinition> = {
  errored: { code: 1, label: 'Errored', rank: 1 },
  failed_exit: { code: 2, label: 'Failed (Exit ≠ 0)', rank: 2 },
  degraded: { code: 3, label: 'Degraded', rank: 3 },
  stopped_manual: { code: 6, label: 'Stopped', rank: 4 },
  waiting_restart: { code: 4, label: 'Waiting Restart', rank: 5 },
  transitioning: { code: 5, label: 'Launching / Stopping', rank: 6 },
  scheduled_idle: { code: 7, label: 'Scheduled (Idle)', rank: 7 },
  completed: { code: 8, label: 'Completed', rank: 8 },
  online: { code: 9, label: 'Online', rank: 9 },
  unknown: { code: 0, label: 'Unknown', rank: 10 },
}

export const STATUS_ORDER = (
  Object.keys(STATUS_CATALOG) as EffectiveStatus[]
).sort((a, b) => STATUS_CATALOG[a].rank - STATUS_CATALOG[b].rank)

export const STATUS_LABELS = STATUS_ORDER.map(
  (status) => STATUS_CATALOG[status].label,
)

export const STATUS_CHART_CATEGORIES = [...STATUS_LABELS].reverse()

const STATUS_BY_CODE = new Map<number, EffectiveStatus>(
  STATUS_ORDER.map((status) => [STATUS_CATALOG[status].code, status]),
)

export function statusFromCode(code: number): EffectiveStatus {
  return STATUS_BY_CODE.get(Math.trunc(code)) ?? 'unknown'
}

export function statusLabelFromCode(code: number): string {
  return STATUS_CATALOG[statusFromCode(code)].label
}

export function statusLabel(status: EffectiveStatus): string {
  return STATUS_CATALOG[status].label
}
