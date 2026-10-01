const EMPTY_VALUE = '—'

const SECOND = 1
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const MONTH = 30 * DAY
const YEAR = 365 * DAY

/**
 * Formats an elapsed uptime (ms since the process last started, as returned
 * by the agent) by scaling the unit to whatever is most meaningful — seconds
 * up through years — with one secondary unit for precision (e.g. "2y 3mo",
 * "5d 4h").
 */
export function formatUptime(uptimeMs: number): string {
  if (!Number.isFinite(uptimeMs) || uptimeMs <= 0) return EMPTY_VALUE

  const seconds = Math.floor(uptimeMs / 1000)

  if (seconds >= YEAR) {
    const years = Math.floor(seconds / YEAR)
    const months = Math.floor((seconds % YEAR) / MONTH)
    return months > 0 ? `${years}y ${months}mo` : `${years}y`
  }
  if (seconds >= MONTH) {
    const months = Math.floor(seconds / MONTH)
    const days = Math.floor((seconds % MONTH) / DAY)
    return days > 0 ? `${months}mo ${days}d` : `${months}mo`
  }
  if (seconds >= DAY) {
    const days = Math.floor(seconds / DAY)
    const hours = Math.floor((seconds % DAY) / HOUR)
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`
  }
  if (seconds >= HOUR) {
    const hours = Math.floor(seconds / HOUR)
    const minutes = Math.floor((seconds % HOUR) / MINUTE)
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }
  if (seconds >= MINUTE) {
    const minutes = Math.floor(seconds / MINUTE)
    const secs = seconds % MINUTE
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`
  }
  return `${seconds}s`
}

/**
 * Formats a PM2 log timestamp prefix (ISO-ish local time, no timezone) for
 * display: `2026-09-19T10:29:08.123` -> `2026-09-19 10:29:08`. String-based on
 * purpose — the prefix is already local time, so no Date parsing is needed.
 * Continuation lines (null) fall back to an em dash; unrecognized shapes pass
 * through unchanged so nothing is hidden.
 */
export function formatLogTimestamp(timestamp: string | null | undefined): string {
  if (!timestamp) return EMPTY_VALUE

  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2}:\d{2})/.exec(timestamp)
  if (!match) return timestamp

  return `${match[1]}-${match[2]}-${match[3]} ${match[4]}`
}

/**
 * Mirrors PM2's `UxHelpers.bytesToSize` (used by `pm2 list`/`pm2 describe`):
 * binary units with lowercase suffixes, e.g. "40.7mb".
 */
export function formatBytes(bytes: number, precision = 1): string {
  if (!Number.isFinite(bytes)) return EMPTY_VALUE

  const kilobyte = 1024
  const megabyte = kilobyte * 1024
  const gigabyte = megabyte * 1024
  const terabyte = gigabyte * 1024

  if (bytes >= 0 && bytes < kilobyte) return `${bytes}b`
  if (bytes < megabyte) return `${(bytes / kilobyte).toFixed(precision)}kb`
  if (bytes < gigabyte) return `${(bytes / megabyte).toFixed(precision)}mb`
  if (bytes < terabyte) return `${(bytes / gigabyte).toFixed(precision)}gb`
  return `${(bytes / terabyte).toFixed(precision)}tb`
}

/**
 * Mirrors how PM2 joins script/interpreter args in `pm2 describe` (space
 * separated) while tolerating the agent's `string | string[]` union.
 */
export function formatArgs(value: string | string[] | null | undefined): string {
  if (value === null || value === undefined) return EMPTY_VALUE

  const args = Array.isArray(value) ? value : [value]
  const joined = args.filter((arg) => arg.trim() !== '').join(' ')
  return joined === '' ? EMPTY_VALUE : joined
}

/**
 * Renders a raw `axm_monitor` entry the way PM2 does in `pm2 describe`
 * ("Code metrics value") and `pm2 monit` ("Custom Metrics"): `${value} ${unit}`.
 * Falls back to the raw value for metrics without a `{ value, unit }` shape.
 */
export function formatMetricValue(metric: unknown): string {
  if (metric === null || metric === undefined) return EMPTY_VALUE
  if (typeof metric !== 'object') return String(metric)

  const entry = metric as { value?: unknown; unit?: unknown }
  if (!('value' in entry)) return EMPTY_VALUE

  const { value, unit } = entry
  if (value === null || value === undefined || value === '') return EMPTY_VALUE

  return typeof unit === 'string' && unit !== ''
    ? `${String(value)} ${unit}`
    : String(value)
}
