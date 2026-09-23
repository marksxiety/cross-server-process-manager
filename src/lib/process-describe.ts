import type {
  ProcessDescribe,
  ProcessDescribeDetails,
  ProcessMetric,
  ProcessSummary,
} from '@/types/process'

/**
 * Placeholder details for agents that predate the summary/describe/metrics
 * payload (their `/pm2/describe/:id` only returns process summaries).
 */
export function emptyDescribe(): ProcessDescribeDetails {
  return {
    version: null,
    script_path: null,
    script_args: null,
    error_log_path: null,
    out_log_path: null,
    pid_path: null,
    interpreter_args: null,
    node_version: null,
    node_env: null,
    created_at: null,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isProcessSummary(value: unknown): value is ProcessSummary {
  if (!isRecord(value)) return false
  return (
    typeof value.pm_id === 'number' &&
    typeof value.name === 'string' &&
    typeof value.status === 'string'
  )
}

function toNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function toStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  return value.filter((item): item is string => typeof item === 'string')
}

function toDescribeDetails(value: unknown): ProcessDescribeDetails {
  if (!isRecord(value)) return emptyDescribe()

  return {
    version: toNullableString(value.version),
    script_path: toNullableString(value.script_path),
    script_args:
      typeof value.script_args === 'string'
        ? value.script_args
        : toStringArray(value.script_args),
    error_log_path: toNullableString(value.error_log_path),
    out_log_path: toNullableString(value.out_log_path),
    pid_path: toNullableString(value.pid_path),
    interpreter_args: toStringArray(value.interpreter_args),
    node_version: toNullableString(value.node_version),
    node_env: toNullableString(value.node_env),
    created_at: toNullableString(value.created_at),
    ...(typeof value.entire_log_path === 'string'
      ? { entire_log_path: value.entire_log_path }
      : {}),
    ...(typeof value.cron_restart === 'string'
      ? { cron_restart: value.cron_restart }
      : {}),
    ...(typeof value.max_memory_restart === 'number' ||
    typeof value.max_memory_restart === 'string'
      ? { max_memory_restart: value.max_memory_restart }
      : {}),
  }
}

function toMetrics(value: unknown): Record<string, ProcessMetric> {
  return isRecord(value) ? (value as Record<string, ProcessMetric>) : {}
}

function fromSummary(summary: ProcessSummary): ProcessDescribe {
  return { summary, describe: emptyDescribe(), metrics: {} }
}

/**
 * Normalizes the agent's `/pm2/describe/:id` payload across agent versions:
 * current agents return `{ summary, describe, metrics }`, legacy agents return
 * a `ProcessSummary[]` (or a bare summary). Returns `null` when the payload is
 * not recognizable as either.
 */
export function normalizeProcessDescribe(info: unknown): ProcessDescribe | null {
  if (Array.isArray(info)) {
    const summary = info.find(isProcessSummary)
    return summary ? fromSummary(summary) : null
  }

  if (!isRecord(info)) return null

  if (isProcessSummary(info.summary)) {
    return {
      summary: info.summary,
      describe: toDescribeDetails(info.describe),
      metrics: toMetrics(info.metrics),
    }
  }

  if (isProcessSummary(info)) return fromSummary(info)

  return null
}
