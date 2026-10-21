import { describe, expect, test } from 'vitest'
import { resolveProcessesStatus } from '@/stores/dashboard.store'
import type { ServerProcesses } from '@/types/dashboard'
import type { LoadStatus } from '@/types/dashboard'

function entry(status: LoadStatus): ServerProcesses {
  return { status, processes: [], overview: null, requestError: null }
}

describe('resolveProcessesStatus', () => {
  test('is idle when no server has answered yet', () => {
    expect(resolveProcessesStatus({})).toBe('idle')
  })

  test('is loading while a server is still answering', () => {
    expect(
      resolveProcessesStatus({
        'api-01': entry('success'),
        'api-02': entry('loading'),
      }),
    ).toBe('loading')
  })

  test('is loading while a server is still answering, even if another failed', () => {
    expect(
      resolveProcessesStatus({
        'api-01': entry('error'),
        'api-02': entry('loading'),
      }),
    ).toBe('loading')
  })

  test('is error once a server could not be reached', () => {
    expect(
      resolveProcessesStatus({
        'api-01': entry('success'),
        'api-02': entry('error'),
      }),
    ).toBe('error')
  })

  test('is success when every server answered', () => {
    expect(
      resolveProcessesStatus({
        'api-01': entry('success'),
        'api-02': entry('success'),
      }),
    ).toBe('success')
  })
})
