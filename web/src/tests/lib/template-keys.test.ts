import { describe, expect, it } from 'vitest'
import { isBlankKey, toSavableKeys } from '@/lib/template-keys'
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

describe('isBlankKey', () => {
  it('is true when both key and value are empty', () => {
    expect(isBlankKey(key({ property_key: '   ', property_value: '  ' }))).toBe(true)
    expect(isBlankKey(key({ property_key: '', property_value: null }))).toBe(true)
  })

  it('is false when a key is present without a value', () => {
    expect(isBlankKey(key({ property_key: 'script', property_value: null }))).toBe(false)
  })
})

describe('toSavableKeys', () => {
  it('drops only rows with neither a key nor a value', () => {
    const rows = [
      key({ property_key: 'script', property_value: 'index.js' }),
      key({ property_key: '', property_value: null }),
      key({ property_key: 'exec_mode', property_value: null }),
      key({ property_key: '  ', property_value: '  ' }),
    ]

    expect(toSavableKeys(rows).map((k) => k.property_key)).toEqual(['script', 'exec_mode'])
  })

  it('keeps the hidden flag intact', () => {
    const rows = [key({ property_key: 'secret', property_value: 'x', is_hidden: true })]

    expect(toSavableKeys(rows)[0]).toMatchObject({ is_hidden: true })
  })
})
