import { describe, expect, test } from 'vitest'
import { percentTone, serverTone } from '../../lib/status-tone'
import type { ServerProcesses } from '../../types/dashboard'
import type { ProcessSummary } from '../../types/process'

function processWithCpu(cpu: number, status: ProcessSummary['status'] = 'online'): ProcessSummary {
  return { cpu, status } as ProcessSummary
}

function serverEntry({
  cores = 8,
  cpu = 10,
  memoryPercentUsed = 50,
  processes = [processWithCpu(10)],
}: {
  cores?: number
  cpu?: number
  memoryPercentUsed?: number
  processes?: ProcessSummary[]
} = {}): ServerProcesses {
  return {
    status: 'success',
    processes,
    overview: {
      cpu: { usagePercent: cpu, cores },
      memory: {
        totalBytes: 1000,
        freeBytes: 1000 - memoryPercentUsed * 10,
        usedBytes: memoryPercentUsed * 10,
        percentUsed: memoryPercentUsed,
      },
    },
    requestError: null,
  }
}

describe('percentTone', () => {
  test('uses warning and danger thresholds', () => {
    expect(percentTone(69)).toBe('success')
    expect(percentTone(70)).toBe('warning')
    expect(percentTone(90)).toBe('danger')
  })
})

describe('serverTone', () => {
  test('reports neutral while loading and danger on error', () => {
    expect(serverTone(undefined)).toBe('neutral')
    expect(serverTone({ ...serverEntry(), status: 'loading' })).toBe('neutral')
    expect(serverTone({ ...serverEntry(), status: 'error' })).toBe('danger')
  })

  test('normalizes process CPU before warning', () => {
    // 80% of one core is only 10% of an 8-core server.
    expect(
      serverTone(serverEntry({ processes: [processWithCpu(80)] })),
    ).toBe('success')
    // 640% of one core is 80% of an 8-core server.
    expect(
      serverTone(serverEntry({ processes: [processWithCpu(640)] })),
    ).toBe('warning')
  })

  test('still reports danger for errored processes and high memory', () => {
    expect(
      serverTone(serverEntry({ processes: [processWithCpu(0, 'errored')] })),
    ).toBe('danger')
    expect(serverTone(serverEntry({ memoryPercentUsed: 95 }))).toBe('danger')
  })
})
