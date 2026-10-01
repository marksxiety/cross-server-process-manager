import { describe, expect, it } from 'vitest'
import { buildTemplatePayload } from '@/lib/template-payload'
import type { TemplateKey } from '@/types/template'

function key(partial: Partial<TemplateKey> & Pick<TemplateKey, 'property_key'>): TemplateKey {
  return {
    property_value: null,
    data_type: 'string',
    is_required: false,
    is_hidden: false,
    is_locked: false,
    ...partial,
  }
}

describe('buildTemplatePayload', () => {
  it('coerces each value according to its data_type', () => {
    const payload = buildTemplatePayload([
      key({ property_key: 'script', property_value: 'index.js', data_type: 'string' }),
      key({ property_key: 'instances', property_value: '2', data_type: 'number' }),
      key({ property_key: 'autorestart', property_value: 'true', data_type: 'boolean' }),
      key({ property_key: 'windowsHide', property_value: 'false', data_type: 'boolean' }),
      key({ property_key: 'args', property_value: '["--port","3000"]', data_type: 'array' }),
      key({ property_key: 'env', property_value: '{"NODE_ENV":"production"}', data_type: 'object' }),
    ])

    expect(payload).toEqual({
      script: 'index.js',
      instances: 2,
      autorestart: true,
      windowsHide: false,
      args: ['--port', '3000'],
      env: { NODE_ENV: 'production' },
    })
  })

  it('treats any non-"true" boolean string as false', () => {
    const payload = buildTemplatePayload([
      key({ property_key: 'watch', property_value: 'yes', data_type: 'boolean' }),
    ])

    expect(payload.watch).toBe(false)
  })

  it('skips rows with an empty key', () => {
    const payload = buildTemplatePayload([
      key({ property_key: '   ', property_value: 'value' }),
    ])

    expect(payload).toEqual({})
  })

  it('skips null and empty values', () => {
    const payload = buildTemplatePayload([
      key({ property_key: 'exec_mode', property_value: null }),
      key({ property_key: 'instances', property_value: '' }),
    ])

    expect(payload).toEqual({})
  })

  it('skips numbers that do not parse', () => {
    const payload = buildTemplatePayload([
      key({ property_key: 'instances', property_value: 'many', data_type: 'number' }),
    ])

    expect(payload).toEqual({})
  })

  it('falls back to the raw string when JSON parsing fails', () => {
    const payload = buildTemplatePayload([
      key({ property_key: 'args', property_value: 'not-json', data_type: 'array' }),
    ])

    expect(payload.args).toBe('not-json')
  })
})
