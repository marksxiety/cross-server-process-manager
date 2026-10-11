import { describe, expect, it } from 'vitest'
import { toSavableValues } from '@/lib/template-keys'

describe('toSavableValues', () => {
  it('drops empty strings, arrays and objects', () => {
    expect(
      toSavableValues({
        script: 'index.js',
        cwd: '   ',
        args: [],
        env: {},
        namespace: '',
      }),
    ).toEqual({ script: 'index.js' })
  })

  it('keeps boolean false and zero', () => {
    expect(toSavableValues({ windowsHide: false, max_restarts: 0 })).toEqual({
      windowsHide: false,
      max_restarts: 0,
    })
  })

  it('drops keys outside the catalog', () => {
    expect(toSavableValues({ custom_flag: '1', script: 'app.py' })).toEqual({ script: 'app.py' })
  })
})
