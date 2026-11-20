import { describe, expect, test } from 'vitest'
import {
  addRecentAbsoluteRange,
  MAX_RECENT_ABSOLUTE_RANGES,
  normalizeRecentAbsoluteRanges,
} from '@/stores/metrics.store'
import type { MetricsRange } from '@/types/prometheus'

function absolute(start: number, end: number): MetricsRange {
  return { kind: 'absolute', start, end }
}

describe('addRecentAbsoluteRange', () => {
  test('keeps relative ranges out of the history', () => {
    const recents = [{ start: 10, end: 20 }]
    const range: MetricsRange = { kind: 'relative', durationMs: 60_000 }

    expect(addRecentAbsoluteRange(recents, range)).toBe(recents)
  })

  test('puts a new range first', () => {
    expect(
      addRecentAbsoluteRange([{ start: 10, end: 20 }], absolute(30, 40)),
    ).toEqual([
      { start: 30, end: 40 },
      { start: 10, end: 20 },
    ])
  })

  test('moves a duplicate range to the top without keeping a copy', () => {
    expect(
      addRecentAbsoluteRange(
        [
          { start: 10, end: 20 },
          { start: 30, end: 40 },
        ],
        absolute(10, 20),
      ),
    ).toEqual([
      { start: 10, end: 20 },
      { start: 30, end: 40 },
    ])
  })

  test('retains only the latest ten ranges', () => {
    let recents: ReturnType<typeof normalizeRecentAbsoluteRanges> = []

    for (let index = 0; index < MAX_RECENT_ABSOLUTE_RANGES + 1; index += 1) {
      recents = addRecentAbsoluteRange(recents, absolute(index, index + 1))
    }

    expect(recents).toHaveLength(MAX_RECENT_ABSOLUTE_RANGES)
    expect(recents[0]).toEqual({ start: 10, end: 11 })
    expect(recents[recents.length - 1]).toEqual({ start: 1, end: 2 })
  })
})

describe('normalizeRecentAbsoluteRanges', () => {
  test('drops malformed and inverted entries', () => {
    expect(
      normalizeRecentAbsoluteRanges([
        { start: 10, end: 20 },
        null,
        'invalid',
        { start: '10', end: 20 },
        { start: 20, end: 10 },
        { start: 30, end: 40 },
      ]),
    ).toEqual([
      { start: 10, end: 20 },
      { start: 30, end: 40 },
    ])
  })

  test('removes duplicates and caps the restored list', () => {
    const entries = Array.from(
      { length: MAX_RECENT_ABSOLUTE_RANGES + 4 },
      (_, index) => ({ start: index, end: index + 1 }),
    )

    expect(
      normalizeRecentAbsoluteRanges([
        { start: 0, end: 1 },
        ...entries,
      ]),
    ).toHaveLength(MAX_RECENT_ABSOLUTE_RANGES)
  })
})
