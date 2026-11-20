import { describe, expect, test } from 'vitest'
import {
  formatRangeLabel,
  MIN_CUSTOM_RANGE_MS,
  parseLocalDateTimeInput,
  toLocalDateTimeInput,
  validateCustomRange,
  zoomOutMetricsRange,
} from '../../lib/time-range'

const MINUTE = 60_000
const HOUR = 60 * MINUTE

describe('formatRangeLabel', () => {
  test('uses the preset label for a known relative range', () => {
    expect(formatRangeLabel({ kind: 'relative', durationMs: 3 * HOUR })).toBe(
      'Last 3 hours',
    )
  })

  test('describes a relative range that is not a preset', () => {
    expect(formatRangeLabel({ kind: 'relative', durationMs: 45 * MINUTE })).toBe(
      'Last 45m',
    )
  })

  test('shows both ends of an absolute range', () => {
    const label = formatRangeLabel({
      kind: 'absolute',
      start: new Date(2026, 10, 18, 10, 0).getTime(),
      end: new Date(2026, 10, 18, 11, 0).getTime(),
    })

    expect(label).toContain('–')
    expect(label).toContain('2026')
  })
})

describe('local datetime input conversion', () => {
  test('round-trips a local timestamp at minute precision', () => {
    const timestamp = new Date(2026, 10, 18, 10, 30).getTime()

    expect(parseLocalDateTimeInput(toLocalDateTimeInput(timestamp))).toBe(
      timestamp,
    )
  })

  test('returns null for an empty input', () => {
    expect(parseLocalDateTimeInput('')).toBeNull()
  })
})

describe('zoomOutMetricsRange', () => {
  const now = new Date(2026, 10, 20, 12, 0).getTime()

  test('doubles a relative range', () => {
    expect(
      zoomOutMetricsRange({ kind: 'relative', durationMs: 30 * MINUTE }, now),
    ).toEqual({ kind: 'relative', durationMs: HOUR })
  })

  test('expands a historical absolute range around its midpoint', () => {
    expect(
      zoomOutMetricsRange(
        {
          kind: 'absolute',
          start: new Date(2026, 10, 20, 10, 0).getTime(),
          end: new Date(2026, 10, 20, 10, 30).getTime(),
        },
        now,
      ),
    ).toEqual({
      kind: 'absolute',
      start: new Date(2026, 10, 20, 9, 45).getTime(),
      end: new Date(2026, 10, 20, 10, 45).getTime(),
    })
  })

  test('extends backward when the expansion would reach the future', () => {
    expect(
      zoomOutMetricsRange(
        {
          kind: 'absolute',
          start: new Date(2026, 10, 20, 11, 0).getTime(),
          end: now,
        },
        now,
      ),
    ).toEqual({
      kind: 'absolute',
      start: new Date(2026, 10, 20, 10, 0).getTime(),
      end: now,
    })
  })
})

describe('validateCustomRange', () => {
  const now = new Date(2026, 10, 18, 12, 0).getTime()

  test('requires both ends', () => {
    expect(validateCustomRange(null, now, now)).toBe(
      'Enter both a start and an end.',
    )
  })

  test('requires the start to be before the end', () => {
    expect(validateCustomRange(now, now, now)).toBe(
      'The start must be before the end.',
    )
  })

  test('requires at least one minute', () => {
    expect(validateCustomRange(now - MIN_CUSTOM_RANGE_MS + 1, now, now)).toBe(
      'Choose a range of at least one minute.',
    )
  })

  test('rejects an end in the future', () => {
    expect(validateCustomRange(now - HOUR, now + MINUTE, now)).toBe(
      'The end cannot be in the future.',
    )
  })

  test('accepts a valid custom range', () => {
    expect(validateCustomRange(now - HOUR, now, now)).toBeNull()
  })
})
