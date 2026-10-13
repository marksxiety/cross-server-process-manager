import { describe, expect, it } from 'vitest'
import { buildTemplatePayload } from '@/lib/template-payload'

describe('buildTemplatePayload', () => {
  it('coerces each value according to the master field list', () => {
    const payload = buildTemplatePayload({
      script: 'index.js',
      exec_mode: 'cluster',
      instances: '2',
      autorestart: true,
      windowsHide: false,
      args: ['--port', '3000'],
      env: { NODE_ENV: 'production' },
      min_uptime: '10s',
    })

    expect(payload).toEqual({
      script: 'index.js',
      exec_mode: 'cluster',
      instances: 2,
      autorestart: true,
      windowsHide: false,
      args: ['--port', '3000'],
      env: { NODE_ENV: 'production' },
      min_uptime: '10s',
    })
  })

  it('keeps boolean false but omits untouched fields', () => {
    const payload = buildTemplatePayload({ windowsHide: false, watch: true, exec_mode: 'fork' })
    expect(payload).toEqual({ windowsHide: false, watch: true, exec_mode: 'fork' })
  })

  it('preserves the "max" instances sentinel', () => {
    expect(buildTemplatePayload({ exec_mode: 'cluster', instances: 'max' })).toEqual({
      exec_mode: 'cluster',
      instances: 'max',
    })
  })

  it('drops empty values and unknown keys', () => {
    const payload = buildTemplatePayload({
      script: '   ',
      args: [],
      env: {},
      unknown_key: 'value',
    })
    expect(payload).toEqual({})
  })

  it('drops numbers that do not parse', () => {
    expect(buildTemplatePayload({ exec_mode: 'cluster', instances: 'many' })).toEqual({
      exec_mode: 'cluster',
    })
  })

  it('skips fields disabled by their enabling rule', () => {
    expect(
      buildTemplatePayload({
        autorestart: true,
        max_restarts: 5,
        cron_restart: '*/5 * * * *',
      }),
    ).toEqual({ autorestart: true, max_restarts: 5 })

    expect(buildTemplatePayload({ exec_mode: 'fork', instances: 4 })).toEqual({
      exec_mode: 'fork',
    })
  })

  it('keeps durations as-is for the agent to normalize', () => {
    expect(buildTemplatePayload({ kill_timeout: 5000 })).toEqual({ kill_timeout: 5000 })
    expect(buildTemplatePayload({ restart_delay: '10s' })).toEqual({ restart_delay: '10s' })
  })
})
