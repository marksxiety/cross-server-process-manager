import { describe, expect, test } from 'vitest'
import { emptyDescribe, isProcessSummary, normalizeProcessDescribe } from '../../lib/process-describe'
import type { ProcessSummary } from '../../types/process'

const summary: ProcessSummary = {
  pid: 12345,
  pm_id: 3,
  name: 'my-app',
  namespace: 'XPM',
  status: 'online',
  uptime: 60000,
  restarts: 1,
  unstable_restarts: 0,
  exec_mode: 'fork_mode',
  interpreter: 'bun',
  cpu: 1.5,
  memory: 9420800,
  cwd: 'C:\\Apps\\my-app',
  ip_address: '192.168.1.10',
  watch: false,
  autorestart: true,
}

describe('isProcessSummary', () => {
  test('accepts a valid summary and rejects other shapes', () => {
    expect(isProcessSummary(summary)).toBe(true)
    expect(isProcessSummary(null)).toBe(false)
    expect(isProcessSummary([])).toBe(false)
    expect(isProcessSummary({ pm_id: 0, name: 'x' })).toBe(false)
    expect(isProcessSummary({ pm_id: '0', name: 'x', status: 'online' })).toBe(false)
  })
})

describe('normalizeProcessDescribe', () => {
  test('passes the current summary/describe/metrics payload through', () => {
    const metrics = { 'Heap Size': { historic: true, type: 'v8', value: '7.65', unit: 'MiB' } }
    const info = {
      summary,
      describe: {
        version: '1.2.3',
        script_path: 'C:\\Apps\\my-app\\dist\\index.js',
        script_args: ['--env-file=.env'],
        error_log_path: 'C:\\logs\\err.log',
        out_log_path: 'C:\\logs\\out.log',
        pid_path: 'C:\\pids\\app.pid',
        interpreter_args: ['--max-old-space-size=512'],
        node_version: '26.3.0',
        node_env: 'production',
        created_at: '2026-09-18T01:57:40.062Z',
        entire_log_path: 'C:\\logs\\combined.log',
        cron_restart: '*/5 * * * *',
        max_memory_restart: '500M',
      },
      metrics,
    }

    expect(normalizeProcessDescribe(info)).toEqual(info)
  })

  test('coerces missing describe and non-object metrics in the current shape', () => {
    const result = normalizeProcessDescribe({ summary, metrics: null })

    expect(result).not.toBeNull()
    expect(result?.summary).toEqual(summary)
    expect(result?.describe).toEqual(emptyDescribe())
    expect(result?.metrics).toEqual({})
  })

  test('nulls out fields missing from a partial describe payload', () => {
    const result = normalizeProcessDescribe({
      summary,
      describe: { version: '1.2.3', node_env: 'production' },
      metrics: {},
    })

    expect(result?.describe).toEqual({
      ...emptyDescribe(),
      version: '1.2.3',
      node_env: 'production',
    })
  })

  test('adapts the legacy summary array payload', () => {
    const result = normalizeProcessDescribe([summary])

    expect(result).toEqual({
      summary,
      describe: emptyDescribe(),
      metrics: {},
    })
  })

  test('picks the first valid summary from a legacy array', () => {
    const result = normalizeProcessDescribe([null, summary, { ...summary, pm_id: 4 }])

    expect(result?.summary.pm_id).toBe(3)
  })

  test('adapts a bare legacy summary object', () => {
    const result = normalizeProcessDescribe(summary)

    expect(result).toEqual({
      summary,
      describe: emptyDescribe(),
      metrics: {},
    })
  })

  test('returns null for empty arrays and unrecognized payloads', () => {
    expect(normalizeProcessDescribe([])).toBeNull()
    expect(normalizeProcessDescribe([{ name: 'not-a-summary' }])).toBeNull()
    expect(normalizeProcessDescribe(null)).toBeNull()
    expect(normalizeProcessDescribe(undefined)).toBeNull()
    expect(normalizeProcessDescribe('online')).toBeNull()
    expect(normalizeProcessDescribe(42)).toBeNull()
    expect(normalizeProcessDescribe({})).toBeNull()
  })
})
