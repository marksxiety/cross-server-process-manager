import { describe, expect, test } from 'vitest'
import { mergeProcessLogs } from '../../lib/process-logs'

describe('mergeProcessLogs', () => {
  test('merges out and error streams ordered by timestamp', () => {
    const merged = mergeProcessLogs({
      out: ['2026-09-19T10:00:01: out-a', '2026-09-19T10:00:03: out-b'],
      error: ['2026-09-19T10:00:02: err-a', '2026-09-19T10:00:04: err-b'],
    })

    expect(merged.map((line) => line.message)).toEqual([
      'out-a',
      'err-a',
      'out-b',
      'err-b',
    ])
    expect(merged.map((line) => line.stream)).toEqual([
      'out',
      'error',
      'out',
      'error',
    ])
  })

  test('assigns continuation lines the previous timestamp in their stream', () => {
    const merged = mergeProcessLogs({
      out: ['2026-09-19T10:00:01: first', '  at foo (bar.js:1)', '2026-09-19T10:00:02: second'],
    })

    const continuation = merged.find((line) => line.message === '  at foo (bar.js:1)')
    expect(continuation?.timestamp).toBe('2026-09-19T10:00:01')
  })

  test('keeps lines without a preceding timestamp as null and sorts them first', () => {
    const merged = mergeProcessLogs({
      out: ['orphan line', '2026-09-19T10:00:01: stamped'],
    })

    expect(merged[0]).toMatchObject({ message: 'orphan line', timestamp: null })
    expect(merged[1]).toMatchObject({ message: 'stamped', timestamp: '2026-09-19T10:00:01' })
  })

  test('tolerates a missing stream', () => {
    const merged = mergeProcessLogs({ out: ['2026-09-19T10:00:01: only-out'] })

    expect(merged).toHaveLength(1)
    expect(merged[0]).toMatchObject({ stream: 'out', message: 'only-out' })
  })

  test('handles null or empty input', () => {
    expect(mergeProcessLogs(null)).toEqual([])
    expect(mergeProcessLogs({})).toEqual([])
    expect(mergeProcessLogs({ out: [], error: [] })).toEqual([])
  })

  test('keeps out before error for equal timestamps', () => {
    const merged = mergeProcessLogs({
      out: ['2026-09-19T10:00:01: out'],
      error: ['2026-09-19T10:00:01: err'],
    })

    expect(merged.map((line) => line.stream)).toEqual(['out', 'error'])
  })

  test('preserves multi-line messages and strips the timestamp from the message', () => {
    const merged = mergeProcessLogs({
      out: ['2026-09-19T10:00:01: Error: boom\n  at x (y.js:2)'],
    })

    expect(merged[0]?.message).toBe('Error: boom\n  at x (y.js:2)')
  })
})
