import { describe, expect, test } from 'vitest'
import { deriveEffectiveStatus } from '../../lib/process-status'
import type { EffectiveStatus, ProcessStatus } from '../../types/process'

const EFFECTIVE_STATUSES: EffectiveStatus[] = [
  'errored',
  'failed_exit',
  'degraded',
  'waiting_restart',
  'transitioning',
  'stopped_manual',
  'scheduled_idle',
  'completed',
  'online',
]

const WIRE_TO_EFFECTIVE: Array<[ProcessStatus, EffectiveStatus]> = [
  ['online', 'online'],
  ['errored', 'errored'],
  ['stopped', 'stopped_manual'],
  ['stopping', 'transitioning'],
  ['launching', 'transitioning'],
  ['one-launch-status', 'transitioning'],
  ['waiting restart', 'waiting_restart'],
  ['unknown', 'stopped_manual'],
]

describe('deriveEffectiveStatus', () => {
  test.each(WIRE_TO_EFFECTIVE)('maps wire status %s to %s', (wire, effective) => {
    expect(deriveEffectiveStatus(wire)).toBe(effective)
  })

  test('passes effective statuses through unchanged', () => {
    for (const status of EFFECTIVE_STATUSES) {
      expect(deriveEffectiveStatus(status)).toBe(status)
    }
  })

  test('normalizes casing and surrounding whitespace', () => {
    expect(deriveEffectiveStatus('  ONLINE ')).toBe('online')
    expect(deriveEffectiveStatus('Waiting Restart')).toBe('waiting_restart')
  })

  test('falls back to stopped_manual for unrecognized or missing values', () => {
    expect(deriveEffectiveStatus('not-a-status')).toBe('stopped_manual')
    expect(deriveEffectiveStatus('')).toBe('stopped_manual')
    expect(deriveEffectiveStatus(null)).toBe('stopped_manual')
    expect(deriveEffectiveStatus(undefined)).toBe('stopped_manual')
  })

  describe('stopped derivation', () => {
    test('derives failed_exit from a non-zero exit code on a one-shot job', () => {
      expect(
        deriveEffectiveStatus({ status: 'stopped', autorestart: false, exit_code: 1 }),
      ).toBe('failed_exit')
      expect(
        deriveEffectiveStatus({ status: 'stopped', autorestart: false, exit_code: 137 }),
      ).toBe('failed_exit')
    })

    test('keeps failed_exit when a one-shot cron job crashes', () => {
      expect(
        deriveEffectiveStatus({
          status: 'stopped',
          autorestart: false,
          cron_restart: '*/5 * * * *',
          exit_code: 2,
        }),
      ).toBe('failed_exit')
    })

    test('treats a stopped service with a non-zero exit as a manual stop', () => {
      expect(
        deriveEffectiveStatus({ status: 'stopped', autorestart: true, exit_code: 1 }),
      ).toBe('stopped_manual')
    })

    test('derives scheduled_idle when a cron restart is configured', () => {
      expect(
        deriveEffectiveStatus({ status: 'stopped', cron_restart: '*/5 * * * *', exit_code: 0 }),
      ).toBe('scheduled_idle')
    })

    test('derives completed for a clean one-shot exit', () => {
      expect(
        deriveEffectiveStatus({ status: 'stopped', autorestart: false, exit_code: 0 }),
      ).toBe('completed')
    })

    test('falls back to stopped_manual for a service stop or missing fields', () => {
      expect(
        deriveEffectiveStatus({ status: 'stopped', autorestart: true, exit_code: 0 }),
      ).toBe('stopped_manual')
      expect(deriveEffectiveStatus({ status: 'stopped' })).toBe('stopped_manual')
    })
  })

  test('derives non-stopped wire statuses from a summary object', () => {
    expect(deriveEffectiveStatus({ status: 'waiting restart' })).toBe('waiting_restart')
    expect(deriveEffectiveStatus({ status: 'online' })).toBe('online')
  })
})
