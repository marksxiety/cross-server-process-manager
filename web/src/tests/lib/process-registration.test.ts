import { describe, expect, test } from 'vitest'
import { catalogField, PROCESS_FIELDS } from '../../lib/process-fields'
import {
  REGISTRATION_MAPPING_KEYS,
  UNMAPPED_FIELD_KEYS,
  advancedRegistrationFields,
  basicRegistrationFields,
  resolveRegistrationField,
} from '../../lib/process-registration'
import type {
  ProcessDescribe,
  ProcessDescribeDetails,
  ProcessSummary,
} from '../../types/process'

function summaryFixture(overrides: Partial<ProcessSummary> = {}): ProcessSummary {
  return {
    pid: 12345,
    pm_id: 3,
    name: 'my-app',
    namespace: 'XPM',
    status: 'online',
    uptime: 60000,
    restarts: 1,
    unstable_restarts: 0,
    exec_mode: 'fork_mode',
    instances: 1,
    interpreter: 'bun',
    cpu: 1.5,
    memory: 9420800,
    cwd: 'C:\\Apps\\my-app',
    ip_address: '192.168.1.10',
    watch: false,
    autorestart: true,
    cron_restart: null,
    exit_code: null,
    ...overrides,
  }
}

function describeFixture(
  overrides: Partial<ProcessDescribeDetails> = {},
): ProcessDescribeDetails {
  return {
    version: '1.2.3',
    script_path: 'C:\\Apps\\my-app\\dist\\index.js',
    script_args: ['--port', '3000'],
    error_log_path: null,
    out_log_path: null,
    pid_path: null,
    interpreter_args: null,
    node_version: '22.14.1',
    node_env: 'production',
    created_at: '2026-03-14T09:12:33.000Z',
    ...overrides,
  }
}

function describePayload(
  summaryOverrides: Partial<ProcessSummary> = {},
  describeOverrides: Partial<ProcessDescribeDetails> = {},
): ProcessDescribe {
  return {
    summary: summaryFixture(summaryOverrides),
    describe: describeFixture(describeOverrides),
    metrics: {},
  }
}

function resolve(key: string, data: ProcessDescribe) {
  const spec = catalogField(key)
  if (spec === undefined) throw new Error(`unknown catalog field: ${key}`)
  return resolveRegistrationField(spec, data)
}

describe('registration mapping coverage', () => {
  test('accounts for every catalog field as mapped or intentionally unmapped', () => {
    for (const field of PROCESS_FIELDS) {
      const accounted =
        REGISTRATION_MAPPING_KEYS.has(field.key) || UNMAPPED_FIELD_KEYS.has(field.key)
      expect(accounted).toBe(true)
    }
    expect(REGISTRATION_MAPPING_KEYS.size + UNMAPPED_FIELD_KEYS.size).toBe(
      PROCESS_FIELDS.length,
    )
  })
})

describe('resolveRegistrationField', () => {
  test('resolves explicitly configured values without the default flag', () => {
    const data = describePayload(
      { name: 'worker', namespace: 'JOBS', cwd: 'C:\\apps\\worker' },
      {
        script_path: 'C:\\apps\\worker\\index.js',
        script_args: ['--once'],
      },
    )

    expect(resolve('name', data)).toMatchObject({ value: 'worker', isDefault: false })
    expect(resolve('namespace', data)).toMatchObject({ value: 'JOBS', isDefault: false })
    expect(resolve('script', data)).toMatchObject({
      value: 'C:\\apps\\worker\\index.js',
      isDefault: false,
    })
    expect(resolve('args', data)).toMatchObject({ value: ['--once'], isDefault: false })
  })

  test('fills in the runtime default and flags it when PM2 reports no value', () => {
    const data = describePayload({ namespace: 'default' })

    expect(resolve('namespace', data)).toEqual({
      spec: catalogField('namespace'),
      value: 'default',
      isDefault: true,
    })
    expect(resolve('autorestart', data)).toMatchObject({ value: true, isDefault: true })
    expect(resolve('watch', data)).toMatchObject({ value: false, isDefault: true })
    expect(resolve('windowsHide', data)).toMatchObject({ value: true, isDefault: true })
    expect(resolve('instances', data)).toMatchObject({ value: 1, isDefault: true })
  })

  test('normalizes PM2 exec_mode variants to the canonical default', () => {
    expect(resolve('exec_mode', describePayload())).toMatchObject({
      value: 'fork',
      isDefault: true,
    })
    const forkVariant = describePayload()
    const withRawFork: ProcessDescribe = {
      ...forkVariant,
      summary: {
        ...forkVariant.summary,
        // Older agents may pass PM2's input value through unnormalized.
        exec_mode: 'fork' as unknown as ProcessSummary['exec_mode'],
      },
    }
    expect(resolve('exec_mode', withRawFork)).toMatchObject({
      value: 'fork',
      isDefault: true,
    })
    expect(resolve('exec_mode', describePayload({ exec_mode: 'cluster_mode' }))).toMatchObject({
      value: 'cluster_mode',
      isDefault: false,
    })
  })

  test('does not flag values that differ from the runtime default', () => {
    const data = describePayload(
      { instances: 2 },
      { max_restarts: 5, min_uptime: '10s', windowsHide: false },
    )

    expect(resolve('max_restarts', data)).toMatchObject({ value: 5, isDefault: false })
    expect(resolve('min_uptime', data)).toMatchObject({ value: '10s', isDefault: false })
    expect(resolve('windowsHide', data)).toMatchObject({ value: false, isDefault: false })
    expect(resolve('instances', data)).toMatchObject({ value: 2, isDefault: false })
  })

  test('reports unset fields without defaults as not configured', () => {
    const data = describePayload()

    expect(resolve('cron_restart', data).value).toBeUndefined()
    expect(resolve('cron_restart', data).isDefault).toBe(false)
    expect(resolve('max_memory_restart', data).value).toBeUndefined()
    expect(resolve('max_memory_restart', data).isDefault).toBe(false)
    expect(resolve('ignore_watch', data).value).toBeUndefined()
    expect(resolve('interpreter_args', data).value).toBeUndefined()
  })
})

describe('group helpers', () => {
  test('return catalog order', () => {
    const data = describePayload()

    expect(basicRegistrationFields(data).map((field) => field.spec.key)).toEqual([
      'name',
      'namespace',
      'cwd',
      'interpreter',
      'script',
      'args',
    ])
    expect(advancedRegistrationFields('restart', data).map((field) => field.spec.key)).toEqual([
      'autorestart',
      'max_restarts',
      'min_uptime',
      'restart_delay',
    ])
    expect(advancedRegistrationFields('scaling', data).map((field) => field.spec.key)).toEqual([
      'exec_mode',
      'instances',
    ])
  })
})
