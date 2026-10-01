import { describe, expect, test } from 'vitest'
import {
  formatArgs,
  formatBytes,
  formatLogTimestamp,
  formatMetricValue,
  formatUptime,
} from '../../lib/format'

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

describe('formatUptime', () => {
  test('returns an em dash for zero, negative and non-finite input', () => {
    expect(formatUptime(0)).toBe('—')
    expect(formatUptime(-1)).toBe('—')
    expect(formatUptime(Number.NaN)).toBe('—')
    expect(formatUptime(Number.POSITIVE_INFINITY)).toBe('—')
  })

  test('formats sub-minute uptimes in seconds', () => {
    expect(formatUptime(45 * SECOND)).toBe('45s')
  })

  test('formats minutes with a seconds remainder', () => {
    expect(formatUptime(90 * SECOND)).toBe('1m 30s')
    expect(formatUptime(60 * SECOND)).toBe('1m')
  })

  test('formats hours with a minutes remainder', () => {
    expect(formatUptime(3 * HOUR + 30 * MINUTE)).toBe('3h 30m')
    expect(formatUptime(3 * HOUR)).toBe('3h')
    expect(formatUptime(22 * HOUR + 51 * MINUTE)).toBe('22h 51m')
  })

  test('formats days with an hours remainder', () => {
    expect(formatUptime(25 * HOUR)).toBe('1d 1h')
    expect(formatUptime(2 * DAY)).toBe('2d')
  })

  test('formats months with a days remainder', () => {
    expect(formatUptime(31 * DAY)).toBe('1mo 1d')
    expect(formatUptime(60 * DAY)).toBe('2mo')
  })

  test('formats years with a months remainder', () => {
    expect(formatUptime(366 * DAY)).toBe('1y')
    expect(formatUptime((2 * 365 + 3 * 30) * DAY)).toBe('2y 3mo')
  })

  test('floors partial units', () => {
    expect(formatUptime(59 * SECOND + 999)).toBe('59s')
    expect(formatUptime(2 * HOUR - 1)).toBe('1h 59m')
  })
})

describe('formatLogTimestamp', () => {
  test('returns an em dash for null, undefined and empty timestamps', () => {
    expect(formatLogTimestamp(null)).toBe('—')
    expect(formatLogTimestamp(undefined)).toBe('—')
    expect(formatLogTimestamp('')).toBe('—')
  })

  test('formats the PM2 timestamp prefix as date and time', () => {
    expect(formatLogTimestamp('2026-09-19T10:29:08')).toBe('2026-09-19 10:29:08')
  })

  test('drops the milliseconds PM2 may append', () => {
    expect(formatLogTimestamp('2026-09-19T10:29:08.123')).toBe('2026-09-19 10:29:08')
  })

  test('passes unrecognized formats through unchanged', () => {
    expect(formatLogTimestamp('not-a-timestamp')).toBe('not-a-timestamp')
  })
})

describe('formatBytes', () => {
  test('returns an em dash for non-finite input', () => {
    expect(formatBytes(Number.NaN)).toBe('—')
    expect(formatBytes(Number.POSITIVE_INFINITY)).toBe('—')
  })

  test('formats bytes below one kilobyte without a decimal', () => {
    expect(formatBytes(512)).toBe('512b')
    expect(formatBytes(0)).toBe('0b')
  })

  test('formats kilobytes, megabytes, gigabytes and terabytes', () => {
    expect(formatBytes(2048)).toBe('2.0kb')
    expect(formatBytes(38805504)).toBe('37.0mb')
    expect(formatBytes(1073741824)).toBe('1.0gb')
    expect(formatBytes(1099511627776)).toBe('1.0tb')
  })

  test('honours the precision argument', () => {
    expect(formatBytes(38805504, 0)).toBe('37mb')
    expect(formatBytes(38805504, 2)).toBe('37.01mb')
  })
})

describe('formatArgs', () => {
  test('returns an em dash for null, undefined and empty values', () => {
    expect(formatArgs(null)).toBe('—')
    expect(formatArgs(undefined)).toBe('—')
    expect(formatArgs('')).toBe('—')
    expect(formatArgs([])).toBe('—')
    expect(formatArgs(['', '  '])).toBe('—')
  })

  test('returns a string argument unchanged', () => {
    expect(formatArgs('--port 3000')).toBe('--port 3000')
  })

  test('joins array arguments with a space like pm2 describe', () => {
    expect(formatArgs(['--env-file=.env', '--max-old-space-size=512'])).toBe(
      '--env-file=.env --max-old-space-size=512',
    )
  })
})

describe('formatMetricValue', () => {
  test('returns an em dash for null, undefined and shapeless objects', () => {
    expect(formatMetricValue(null)).toBe('—')
    expect(formatMetricValue(undefined)).toBe('—')
    expect(formatMetricValue({})).toBe('—')
    expect(formatMetricValue({ value: null })).toBe('—')
  })

  test('renders value and unit like pm2 describe', () => {
    expect(formatMetricValue({ value: 100, unit: '%' })).toBe('100 %')
    expect(formatMetricValue({ value: '7.65', unit: 'MiB' })).toBe('7.65 MiB')
  })

  test('omits the unit when absent or empty', () => {
    expect(formatMetricValue({ value: 0 })).toBe('0')
    expect(formatMetricValue({ value: 0, unit: '' })).toBe('0')
  })

  test('renders raw non-object metric values', () => {
    expect(formatMetricValue(42)).toBe('42')
    expect(formatMetricValue('online')).toBe('online')
  })
})
