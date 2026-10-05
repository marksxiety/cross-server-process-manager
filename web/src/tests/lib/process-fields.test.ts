import { describe, expect, it } from 'vitest'
import {
  ALLOWED_FIELD_KEYS,
  PROCESS_FIELDS,
  REQUIRED_FIELD_KEYS,
  buildCatalogFields,
  catalogField,
  groupTemplateKeys,
  validateFields,
} from '@/lib/process-fields'
import type { TemplateKey } from '@/types/template'

function key(partial: Partial<TemplateKey> & Pick<TemplateKey, 'property_key'>): TemplateKey {
  return {
    property_value: null,
    data_type: 'string',
    is_required: false,
    is_hidden: false,
    ...partial,
  }
}

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
  })

  it('marks the agent-required fields as required', () => {
    expect([...REQUIRED_FIELD_KEYS].sort()).toEqual(['cwd', 'interpreter', 'name', 'script'])
  })

  it('pre-fills the advanced defaults for the None template', () => {
    const fields = buildCatalogFields()
    const value = (propertyKey: string) =>
      fields.find((field) => field.property_key === propertyKey)?.property_value

    expect(value('exec_mode')).toBe('fork')
    expect(value('instances')).toBe('1')
    expect(value('autorestart')).toBe('true')
    expect(value('max_restarts')).toBe('15')
    expect(value('min_uptime')).toBe('10s')
    expect(value('restart_delay')).toBe('4000')
    expect(value('kill_timeout')).toBe('5000')
    expect(value('max_memory_restart')).toBeNull()
  })

  it('uses the catalog data types and required flags', () => {
    expect(catalogField('env')?.dataType).toBe('object')
    expect(catalogField('args')?.dataType).toBe('array')
    expect(catalogField('autorestart')?.dataType).toBe('boolean')
    expect(catalogField('script')?.isRequired).toBe(true)
    expect(catalogField('not-a-field')).toBeUndefined()
  })
})

describe('groupTemplateKeys', () => {
  it('splits fields into the basic and advanced cards in catalog order', () => {
    const { basic, advanced } = groupTemplateKeys([
      key({ property_key: 'script' }),
      key({ property_key: 'autorestart' }),
      key({ property_key: 'name' }),
    ])

    expect(basic.map((field) => field.property_key)).toEqual(['name', 'script'])
    expect(advanced.map((field) => field.property_key)).toEqual(['autorestart'])
  })

  it('falls back to advanced for keys outside the catalog', () => {
    const { basic, advanced } = groupTemplateKeys([
      key({ property_key: 'unknown_key' }),
      key({ property_key: 'autorestart' }),
    ])

    expect(basic).toEqual([])
    expect(advanced.map((field) => field.property_key)).toEqual(['autorestart', 'unknown_key'])
  })
})

describe('validateFields', () => {
  it('reports missing required fields', () => {
    const errors = validateFields([key({ property_key: 'name', property_value: 'app' })])

    expect(errors).toMatchObject({
      cwd: 'This field is required',
      interpreter: 'This field is required',
      script: 'This field is required',
    })
  })

  it('accepts "max" for instances but rejects zero and non-numbers', () => {
    const base = [
      key({ property_key: 'name', property_value: 'app' }),
      key({ property_key: 'cwd', property_value: 'C:/app' }),
      key({ property_key: 'interpreter', property_value: 'none' }),
      key({ property_key: 'script', property_value: 'app.exe' }),
    ]

    expect(
      validateFields([
        ...base,
        key({ property_key: 'instances', property_value: 'max', data_type: 'number' }),
      ]),
    ).toEqual({})

    expect(
      validateFields([
        ...base,
        key({ property_key: 'instances', property_value: '0', data_type: 'number' }),
      ]).instances,
    ).toBe('Must be a positive integer or "max"')

    expect(
      validateFields([
        ...base,
        key({ property_key: 'instances', property_value: 'many', data_type: 'number' }),
      ]).instances,
    ).toBe('Must be a number')
  })

  it('validates the new advanced fields by type', () => {
    const base = [
      key({ property_key: 'name', property_value: 'app' }),
      key({ property_key: 'cwd', property_value: 'C:/app' }),
      key({ property_key: 'interpreter', property_value: 'none' }),
      key({ property_key: 'script', property_value: 'app.exe' }),
    ]

    expect(
      validateFields([
        ...base,
        key({ property_key: 'restart_delay', property_value: 'soon', data_type: 'number' }),
        key({ property_key: 'kill_timeout', property_value: '5000', data_type: 'number' }),
        key({ property_key: 'min_uptime', property_value: '10s' }),
        key({ property_key: 'cron_restart', property_value: '0 0 * * *' }),
      ]),
    ).toEqual({ restart_delay: 'Must be a number' })
  })

  it('rejects duplicate keys and non-string env values', () => {
    const errors = validateFields([
      key({ property_key: 'name', property_value: 'app' }),
      key({ property_key: 'name', property_value: 'other' }),
      key({
        property_key: 'env',
        data_type: 'object',
        property_value: '{"PORT": 3000}',
      }),
    ])

    expect(errors.name).toBe('Duplicate field "name"')
    expect(errors.env).toBe('Every env value must be a string')
  })

  it('rejects malformed JSON array and object values', () => {
    const errors = validateFields([
      key({ property_key: 'args', data_type: 'array', property_value: 'not-json' }),
      key({ property_key: 'env', data_type: 'object', property_value: '["a"]' }),
    ])

    expect(errors.args).toBe('Must be valid JSON')
    expect(errors.env).toBe('Must be a JSON object')
  })
})
