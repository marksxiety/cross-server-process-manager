import { describe, expect, test } from 'vitest'
import { STATUS_VISUALS, getStatusContext, getStatusVisual } from '../../lib/status-styles'
import type { EffectiveStatus } from '../../types/process'

const ALL_STATUSES = Object.keys(STATUS_VISUALS) as EffectiveStatus[]

describe('STATUS_VISUALS', () => {
  test('defines every class slot for every status', () => {
    for (const status of ALL_STATUSES) {
      const visual = STATUS_VISUALS[status]
      expect(visual.label).not.toBe('')
      expect(visual.icon).toBeDefined()
      expect(visual.dot).toMatch(/^bg-/)
      expect(visual.text).toMatch(/^text-/)
      expect(visual.surface).toMatch(/^bg-/)
      expect(visual.border).toMatch(/^border-/)
      expect(visual.ring).toMatch(/^ring-/)
    }
  })

  test('pulses only for active lifecycle and error states', () => {
    const pulsing = ALL_STATUSES.filter((status) => STATUS_VISUALS[status].pulse)

    expect(pulsing.sort()).toEqual([
      'degraded',
      'errored',
      'failed_exit',
      'transitioning',
      'waiting_restart',
    ])
  })

  test('maps online to emerald shades', () => {
    const online = STATUS_VISUALS.online

    expect(online.dot).toBe('bg-emerald-500')
    expect(online.text).toBe('text-emerald-700 dark:text-emerald-400')
    expect(online.surface).toBe('bg-emerald-50 dark:bg-emerald-950')
    expect(online.border).toBe('border-emerald-200 dark:border-emerald-800')
  })

  test('maps errored to red shades', () => {
    const errored = STATUS_VISUALS.errored

    expect(errored.dot).toBe('bg-red-500')
    expect(errored.text).toBe('text-red-700 dark:text-red-400')
    expect(errored.surface).toBe('bg-red-50 dark:bg-red-950')
    expect(errored.border).toBe('border-red-200 dark:border-red-800')
  })
})

describe('getStatusVisual', () => {
  test('returns the matching visual when the status is known', () => {
    expect(getStatusVisual('online')).toBe(STATUS_VISUALS.online)
  })

  test('normalizes PM2 wire statuses before lookup', () => {
    expect(getStatusVisual('stopping')).toBe(STATUS_VISUALS.transitioning)
    expect(getStatusVisual('waiting restart')).toBe(STATUS_VISUALS.waiting_restart)
    expect(getStatusVisual('unknown')).toBe(STATUS_VISUALS.stopped_manual)
  })

  test('derives from a process summary object', () => {
    expect(
      getStatusVisual({ status: 'stopped', autorestart: false, exit_code: 1 }),
    ).toBe(STATUS_VISUALS.failed_exit)
    expect(
      getStatusVisual({ status: 'stopped', autorestart: false, exit_code: 0 }),
    ).toBe(STATUS_VISUALS.completed)
    expect(getStatusVisual({ status: 'stopped', cron_restart: '*/5 * * * *' })).toBe(
      STATUS_VISUALS.scheduled_idle,
    )
    expect(getStatusVisual({ status: 'stopped', autorestart: true, exit_code: 1 })).toBe(
      STATUS_VISUALS.stopped_manual,
    )
  })

  test('falls back to the neutral stopped visual for null and undefined', () => {
    expect(getStatusVisual(null)).toBe(STATUS_VISUALS.stopped_manual)
    expect(getStatusVisual(undefined)).toBe(STATUS_VISUALS.stopped_manual)
  })
})

describe('getStatusContext', () => {
  test('returns null for online processes', () => {
    expect(getStatusContext({ status: 'online' })).toBeNull()
  })

  test('explains active lifecycle and error states', () => {
    expect(getStatusContext({ status: 'errored' })).toBe(
      'Crashed repeatedly — PM2 stopped restarting',
    )
    expect(getStatusContext({ status: 'waiting restart' })).toBe(
      'Crashed — PM2 will restart it shortly',
    )
    expect(getStatusContext({ status: 'stopping' })).toBe('Starting or stopping right now')
  })

  test('includes the exit code for one-shot crashes', () => {
    expect(
      getStatusContext({ status: 'stopped', autorestart: false, exit_code: 1 }),
    ).toBe('Crashed with exit code 1')
  })

  test('explains manual stops and clean one-shot exits', () => {
    expect(getStatusContext({ status: 'stopped', autorestart: true, exit_code: 1 })).toBe(
      'Stopped manually',
    )
    expect(getStatusContext({ status: 'stopped', autorestart: false, exit_code: 0 })).toBe(
      'Finished cleanly (exit 0)',
    )
  })

  test('includes the cron expression for scheduled jobs', () => {
    expect(
      getStatusContext({ status: 'stopped', cron_restart: '*/5 * * * *' }),
    ).toBe('Waiting for the next run (*/5 * * * *)')
    expect(getStatusContext({ status: 'stopped', cron_restart: null })).toBe('Stopped manually')
  })
})
