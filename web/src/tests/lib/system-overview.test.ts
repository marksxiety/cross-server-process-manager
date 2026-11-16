import { describe, expect, test } from 'vitest'
import { toSystemOverview } from '../../lib/system-overview'

describe('toSystemOverview', () => {
  test('carries the agent sample time and CPU window', () => {
    const overview = toSystemOverview({
      cpu: { usagePercent: 12.5, cores: 8, windowMs: 5_000 },
      memory: {
        totalBytes: 1_000,
        freeBytes: 400,
        usedBytes: 600,
        percentUsed: 60,
      },
      sampledAt: 1_700_000_000_000,
      logs: { totalBytes: 10, fileCount: 1 },
    })

    expect(overview.cpu.windowMs).toBe(5_000)
    expect(overview.sampledAt).toBe(1_700_000_000_000)
  })

  test('reports missing metadata as null instead of zero', () => {
    const overview = toSystemOverview({
      cpu: { usagePercent: 12.5, cores: 8 },
      memory: { totalBytes: 1_000, usedBytes: 600 },
    })

    expect(overview.cpu.windowMs).toBeNull()
    expect(overview.sampledAt).toBeNull()
  })

  test('falls back to safe numbers for malformed input', () => {
    const overview = toSystemOverview(null)

    expect(overview.cpu).toEqual({ usagePercent: 0, cores: 0, windowMs: null })
    expect(overview.memory.percentUsed).toBe(0)
    expect(overview.sampledAt).toBeNull()
  })
})
