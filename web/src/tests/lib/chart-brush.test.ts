import { describe, expect, test } from 'vitest'
import {
  clampTimeRange,
  MIN_BRUSH_SPAN_MS,
  resolveBrushSelection,
} from '../../lib/chart-brush'

const SECOND = 1_000

describe('resolveBrushSelection', () => {
  test('returns an ordered range from a flat coordRange', () => {
    expect(resolveBrushSelection([1_000, 5_000])).toEqual({
      start: 1_000,
      end: 5_000,
    })
  })

  test('normalises a reversed drag', () => {
    expect(resolveBrushSelection([5_000, 1_000])).toEqual({
      start: 1_000,
      end: 5_000,
    })
  })

  test('unwraps a nested coordRange', () => {
    expect(resolveBrushSelection([[5_000, 1_000]])).toEqual({
      start: 1_000,
      end: 5_000,
    })
  })

  test('accepts a span exactly at the minimum', () => {
    expect(
      resolveBrushSelection([1_000, 1_000 + MIN_BRUSH_SPAN_MS]),
    ).toEqual({ start: 1_000, end: 1_000 + MIN_BRUSH_SPAN_MS })
  })

  test('rejects micro-drags', () => {
    expect(resolveBrushSelection([1_000, 2_000])).toBeNull()
  })

  test('rejects malformed ranges', () => {
    expect(resolveBrushSelection(null)).toBeNull()
    expect(resolveBrushSelection([])).toBeNull()
    expect(resolveBrushSelection([1_000])).toBeNull()
    expect(resolveBrushSelection(['nope', 5_000])).toBeNull()
    expect(resolveBrushSelection([Number.NaN, 5_000])).toBeNull()
  })
})

describe('clampTimeRange', () => {
  const now = 1_700_000_000_000

  test('clamps the end to now', () => {
    expect(clampTimeRange(now - 5 * SECOND, now + 5 * SECOND, now)).toEqual({
      start: now - 5 * SECOND,
      end: now,
    })
  })

  test('clamps the start to the epoch', () => {
    expect(clampTimeRange(-5 * SECOND, 5 * SECOND, now)).toEqual({
      start: 0,
      end: 5 * SECOND,
    })
  })

  test('normalises a reversed range', () => {
    expect(
      clampTimeRange(now - SECOND, now - 5 * SECOND, now),
    ).toEqual({ start: now - 5 * SECOND, end: now - SECOND })
  })

  test('rejects a selection entirely in the future', () => {
    expect(
      clampTimeRange(now + SECOND, now + 5 * SECOND, now),
    ).toBeNull()
  })

  test('rejects a selection shorter than the minimum', () => {
    expect(clampTimeRange(now - SECOND, now, now)).toBeNull()
  })
})
