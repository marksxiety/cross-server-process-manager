import { describe, expect, test } from 'vitest'
import {
  STATUS_CATALOG,
  STATUS_CHART_CATEGORIES,
  STATUS_ORDER,
  statusFromCode,
  statusLabel,
  statusLabelFromCode,
} from '../../lib/status-catalog'
import type { EffectiveStatus } from '../../types/process'

const STATUSES = Object.keys(STATUS_CATALOG) as EffectiveStatus[]

describe('STATUS_CATALOG', () => {
  test('assigns unique codes and ranks to every status', () => {
    expect(new Set(STATUSES.map((status) => STATUS_CATALOG[status].code)).size).toBe(
      STATUSES.length,
    )
    expect(new Set(STATUSES.map((status) => STATUS_CATALOG[status].rank)).size).toBe(
      STATUSES.length,
    )
  })

  test('orders statuses from most severe to unknown', () => {
    expect(STATUS_ORDER).toEqual([
      'errored',
      'failed_exit',
      'degraded',
      'stopped_manual',
      'waiting_restart',
      'transitioning',
      'scheduled_idle',
      'completed',
      'online',
      'unknown',
    ])
    expect(STATUS_CHART_CATEGORIES).toEqual(
      [...STATUS_ORDER].reverse().map((status) => statusLabel(status)),
    )
  })
})

describe('statusFromCode', () => {
  test('maps every catalog code back to its status', () => {
    for (const status of STATUSES) {
      expect(statusFromCode(STATUS_CATALOG[status].code)).toBe(status)
    }
  })

  test('falls back to unknown for missing codes', () => {
    expect(statusFromCode(99)).toBe('unknown')
    expect(statusLabelFromCode(99)).toBe('Unknown')
  })

  test('returns the Dashboard label for a code', () => {
    expect(statusLabelFromCode(1)).toBe('Errored')
    expect(statusLabelFromCode(6)).toBe('Stopped')
    expect(statusLabelFromCode(7)).toBe('Scheduled (Idle)')
    expect(statusLabelFromCode(8)).toBe('Completed')
    expect(statusLabelFromCode(9)).toBe('Online')
  })
})
