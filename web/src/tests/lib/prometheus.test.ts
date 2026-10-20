import { describe, expect, test } from 'vitest'
import {
  buildSelector,
  computeStep,
  escapeLabelValue,
  formatDurationSeconds,
  formatMetricAxisValue,
  formatMetricValue,
  lastPoint,
  lastValue,
  parseMatrixResult,
  PROMETHEUS_RETENTION_MS,
  resolveMetricsRange,
  statusLabel,
} from '../../lib/prometheus'

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

describe('escapeLabelValue', () => {
  test('escapes backslashes, quotes and newlines', () => {
    expect(escapeLabelValue('a"b\\c\nd')).toBe('a\\"b\\\\c\\nd')
    expect(escapeLabelValue('line\r\nbreak')).toBe('line\\n\\nbreak')
  })
})

describe('buildSelector', () => {
  const target = { name: 'xpm-server', namespace: 'XPM', server: 'MYPC' }

  test('builds a fully qualified selector', () => {
    expect(buildSelector('pm2_cpu', target)).toBe(
      'pm2_cpu{name="xpm-server",namespace="XPM",app="MYPC"}',
    )
  })

  test('omits an empty server label', () => {
    expect(buildSelector('pm2_memory', { ...target, server: '' })).toBe(
      'pm2_memory{name="xpm-server",namespace="XPM"}',
    )
  })

  test('escapes label values', () => {
    expect(buildSelector('pm2_cpu', { ...target, name: 'api"gateway' })).toBe(
      'pm2_cpu{name="api\\"gateway",namespace="XPM",app="MYPC"}',
    )
  })
})

describe('computeStep', () => {
  test('never goes below the scrape interval', () => {
    expect(computeStep(1)).toBe(15)
    expect(computeStep(15 * MINUTE)).toBe(15)
    expect(computeStep(HOUR)).toBe(15)
  })

  test('keeps at most 500 points for common ranges', () => {
    expect(computeStep(6 * HOUR)).toBe(60)
    expect(computeStep(DAY)).toBe(300)
    expect(computeStep(7 * DAY)).toBe(1800)
    expect(computeStep(PROMETHEUS_RETENTION_MS)).toBe(3600)
  })
})

describe('resolveMetricsRange', () => {
  const now = 1_700_000_000_000

  test('resolves relative ranges against now', () => {
    expect(resolveMetricsRange({ kind: 'relative', durationMs: HOUR }, now)).toEqual({
      start: now - HOUR,
      end: now,
      step: 15,
    })
  })

  test('keeps a historical absolute end', () => {
    expect(
      resolveMetricsRange(
        { kind: 'absolute', start: now - 2 * HOUR, end: now - HOUR },
        now,
      ),
    ).toEqual({
      start: now - 2 * HOUR,
      end: now - HOUR,
      step: 15,
    })
  })

  test('clamps the start to the retention window', () => {
    const resolved = resolveMetricsRange(
      { kind: 'relative', durationMs: 30 * DAY },
      now,
    )

    expect(resolved.start).toBe(now - PROMETHEUS_RETENTION_MS)
    expect(resolved.end).toBe(now)
  })
})

describe('parseMatrixResult', () => {
  test('converts timestamps to milliseconds and parses values', () => {
    const series = parseMatrixResult([
      {
        metric: { __name__: 'pm2_cpu', name: 'xpm-server' },
        values: [
          [1700000000, '1.5'],
          [1700000015, '2'],
        ],
      },
    ])

    expect(series).toEqual([
      {
        metric: { __name__: 'pm2_cpu', name: 'xpm-server' },
        points: [
          { timestamp: 1700000000000, value: 1.5 },
          { timestamp: 1700000015000, value: 2 },
        ],
      },
    ])
  })

  test('skips malformed series and samples', () => {
    const series = parseMatrixResult([
      {
        metric: { name: 'bad' },
        values: [
          [1700000000, 'NaN'],
          'nope',
          [1700000015],
        ],
      },
      { metric: { name: 'empty' }, values: [] },
      null,
    ])

    expect(series).toEqual([])
  })

  test('returns an empty array for a non-array payload', () => {
    expect(parseMatrixResult(null)).toEqual([])
    expect(parseMatrixResult({})).toEqual([])
  })
})

describe('lastPoint', () => {
  test('returns the latest point across series', () => {
    const series = [
      { metric: {}, points: [{ timestamp: 10, value: 1 }] },
      {
        metric: {},
        points: [
          { timestamp: 20, value: 2 },
          { timestamp: 5, value: 3 },
        ],
      },
    ]

    expect(lastPoint(series)).toEqual({ timestamp: 20, value: 2 })
    expect(lastValue(series)).toBe(2)
    expect(lastValue(undefined)).toBeNull()
  })
})

describe('statusLabel', () => {
  test('maps exporter status codes', () => {
    expect(statusLabel(0)).toBe('unknown')
    expect(statusLabel(1)).toBe('online')
    expect(statusLabel(4)).toBe('waiting restart')
    expect(statusLabel(7)).toBe('one-launch-status')
    expect(statusLabel(99)).toBe('unknown')
  })
})

describe('metric formatting', () => {
  test('formats values for tooltips', () => {
    expect(formatMetricValue('pm2_cpu', 12.345)).toBe('12.35%')
    expect(formatMetricValue('pm2_memory', 1024)).toBe('1.0kb')
    expect(formatMetricValue('pm2_uptime', 3600)).toBe('1h')
    expect(formatMetricValue('pm2_restarts_total', 3.8)).toBe('3')
    expect(formatMetricValue('pm2_status', 1)).toBe('online')
  })

  test('formats axis values', () => {
    expect(formatMetricAxisValue('pm2_cpu', 12.6)).toBe('13%')
    expect(formatMetricAxisValue('pm2_memory', 1024)).toBe('1.0kb')
    expect(formatMetricAxisValue('pm2_uptime', 3600)).toBe('1h')
  })

  test('formats zero and sub-second durations', () => {
    expect(formatDurationSeconds(0)).toBe('0s')
    expect(formatDurationSeconds(0.5)).toBe('0s')
    expect(formatDurationSeconds(90)).toBe('1m 30s')
  })
})
