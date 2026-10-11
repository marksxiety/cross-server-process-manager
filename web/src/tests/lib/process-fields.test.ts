import { describe, expect, it } from 'vitest'
import {
  ADVANCED_GROUPS,
  ALLOWED_FIELD_KEYS,
  PROCESS_FIELDS,
  REQUIRED_FIELD_KEYS,
  advancedGroupFields,
  basicFields,
  catalogField,
  isFieldEnabled,
  validateRegisterValues,
} from '@/lib/process-fields'

describe('process field catalog', () => {
  it('defines every key at most once', () => {
    const keys = PROCESS_FIELDS.map((field) => field.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('derives the allowed key set from the catalog', () => {
    expect(ALLOWED_FIELD_KEYS.size).toBe(PROCESS_FIELDS.length)
    expect(ALLOWED_FIELD_KEYS.has('script')).toBe(true)
    expect(ALLOWED_FIELD_KEYS.has('kill_timeout')).toBe(true)
    expect(ALLOWED_FIELD_KEYS.has('targetOs')).toBe(false)
    expect(ALLOWED_FIELD_KEYS.has('increment_var')).toBe(false)
  })

  it('marks the agent-required fields as required', () => {
    expect([...REQUIRED_FIELD_KEYS].sort()).toEqual(['cwd', 'interpreter', 'name', 'script'])
  })

  it('places fields in the specified basic and advanced groups', () => {
    expect(basicFields().map((field) => field.key)).toEqual([
      'name',
      'namespace',
      'cwd',
      'interpreter',
      'script',
      'args',
      'env',
    ])

    expect(ADVANCED_GROUPS.map((group) => group.id)).toEqual([
      'restart',
      'schedule',
      'resources',
      'watch',
      'overrides',
      'scaling',
    ])

    expect(advancedGroupFields('restart').map((field) => field.key)).toEqual([
      'autorestart',
      'max_restarts',
      'min_uptime',
      'restart_delay',
    ])
    expect(advancedGroupFields('scaling').map((field) => field.key)).toEqual([
      'exec_mode',
      'instances',
    ])
    expect(advancedGroupFields('overrides').map((field) => field.key)).toEqual([
      'interpreter_args',
      'windowsHide',
    ])
  })

  it('uses neutral, language-agnostic placeholders', () => {
    const fields = PROCESS_FIELDS.map((field) => `${field.placeholder ?? ''} ${field.hint ?? ''}`).join(' ')
    expect(fields).not.toMatch(/NODE_ENV|--env-file|--port|node\.exe|index\.js/i)
    expect(catalogField('interpreter')?.placeholder).toBe('C:/path/to/interpreter or none')
  })

  it('exposes the catalog types', () => {
    expect(catalogField('env')?.type).toBe('object')
    expect(catalogField('args')?.type).toBe('array')
    expect(catalogField('autorestart')?.type).toBe('boolean')
    expect(catalogField('min_uptime')?.type).toBe('duration')
    expect(catalogField('kill_timeout')?.type).toBe('duration')
    expect(catalogField('watch_delay')?.type).toBe('duration')
    expect(catalogField('script')?.required).toBe(true)
    expect(catalogField('not-a-field')).toBeUndefined()
  })

  it('dims dependent fields until their toggle is set', () => {
    const ignoreWatch = catalogField('ignore_watch')!
    const watchDelay = catalogField('watch_delay')!
    const instances = catalogField('instances')!

    expect(isFieldEnabled(ignoreWatch, {})).toBe(false)
    expect(isFieldEnabled(ignoreWatch, { watch: true })).toBe(true)
    expect(isFieldEnabled(watchDelay, { watch: true })).toBe(true)
    expect(isFieldEnabled(instances, { exec_mode: 'fork' })).toBe(false)
    expect(isFieldEnabled(instances, { exec_mode: 'cluster' })).toBe(true)
  })
})

describe('validateRegisterValues', () => {
  it('reports missing required fields', () => {
    const errors = validateRegisterValues({ name: 'app' })
    expect(errors).toMatchObject({
      cwd: 'This field is required',
      interpreter: 'This field is required',
      script: 'This field is required',
    })
  })

  it('accepts "max" for instances but rejects zero and non-numbers', () => {
    const base = { name: 'app', cwd: 'C:/app', interpreter: 'none', script: 'app.exe' }

    expect(validateRegisterValues({ ...base, instances: 'max' })).toEqual({})
    expect(validateRegisterValues({ ...base, instances: '0' }).instances).toBe(
      'Must be a positive integer or "max"',
    )
    expect(validateRegisterValues({ ...base, instances: 'many' }).instances).toBe('Must be a number')
  })

  it('accepts duration strings and milliseconds', () => {
    const base = { name: 'app', cwd: 'C:/app', interpreter: 'none', script: 'app.exe' }
    expect(validateRegisterValues({ ...base, min_uptime: '10s' })).toEqual({})
    expect(validateRegisterValues({ ...base, kill_timeout: 5000 })).toEqual({})
    expect(validateRegisterValues({ ...base, restart_delay: 'soon' }).restart_delay).toBe(
      'Must be a number of milliseconds or a duration like 10s',
    )
  })

  it('rejects non-string env values', () => {
    const errors = validateRegisterValues({
      name: 'app',
      cwd: 'C:/app',
      interpreter: 'none',
      script: 'app.exe',
      env: { PORT: 3000 },
    })
    expect(errors.env).toBe('Every value must be a string')
  })
})
