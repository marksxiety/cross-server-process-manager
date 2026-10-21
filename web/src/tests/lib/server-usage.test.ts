import { describe, expect, test } from 'vitest'
import {
  cpuUsageShares,
  formatUsagePercent,
  memoryUsageShares,
  resolveUsageStatus,
  serverCpuShare,
} from '../../lib/server-usage'

describe('formatUsagePercent', () => {
  test('uses two decimals below one percent', () => {
    expect(formatUsagePercent(0)).toBe('0.00%')
    expect(formatUsagePercent(0.5)).toBe('0.50%')
  })

  test('uses one decimal from one percent upward', () => {
    expect(formatUsagePercent(1)).toBe('1.0%')
    expect(formatUsagePercent(10.25)).toBe('10.3%')
    expect(formatUsagePercent(100)).toBe('100.0%')
  })
})

describe('cpuUsageShares', () => {
  test('normalizes PM2 CPU by the host core count', () => {
    expect(cpuUsageShares(200, 60, 8)).toEqual({ pm2: 25, other: 35 })
  })

  test('does not let other go below zero', () => {
    expect(cpuUsageShares(200, 10, 8)).toEqual({ pm2: 25, other: 0 })
  })

  test('falls back to other zero when host CPU is unavailable', () => {
    expect(cpuUsageShares(80, null, 8)).toEqual({ pm2: 10, other: 0 })
  })

  test('returns null without PM2 data or valid cores', () => {
    expect(cpuUsageShares(null, 60, 8)).toBeNull()
    expect(cpuUsageShares(80, 60, null)).toBeNull()
    expect(cpuUsageShares(80, 60, 0)).toBeNull()
  })

  test('caps PM2 at 100 percent of the server', () => {
    expect(cpuUsageShares(1600, 60, 8)).toEqual({ pm2: 100, other: 0 })
  })
})

describe('serverCpuShare', () => {
  test('normalizes a process CPU percentage to the server', () => {
    expect(serverCpuShare(200, 8)).toBe(25)
    expect(serverCpuShare(1, 8)).toBe(0.125)
  })

  test('caps the server share at 100', () => {
    expect(serverCpuShare(1600, 8)).toBe(100)
  })

  test('returns null without a valid core count', () => {
    expect(serverCpuShare(80, null)).toBeNull()
    expect(serverCpuShare(80, 0)).toBeNull()
    expect(serverCpuShare(Number.NaN, 8)).toBeNull()
  })
})

describe('memoryUsageShares', () => {
  test('computes PM2 and other shares of host RAM', () => {
    expect(memoryUsageShares(100, 500, 1000)).toEqual({
      pm2: 10,
      other: 40,
    })
  })

  test('does not let other go below zero when PM2 overshoots host used', () => {
    expect(memoryUsageShares(600, 500, 1000)).toEqual({
      pm2: 60,
      other: 0,
    })
  })

  test('falls back to other zero when host used memory is unavailable', () => {
    expect(memoryUsageShares(100, null, 1000)).toEqual({
      pm2: 10,
      other: 0,
    })
  })

  test('caps PM2 at 100 percent of host RAM', () => {
    expect(memoryUsageShares(1200, 900, 1000)).toEqual({
      pm2: 100,
      other: 0,
    })
  })

  test('returns null without PM2 data or a valid host total', () => {
    expect(memoryUsageShares(null, 500, 1000)).toBeNull()
    expect(memoryUsageShares(100, 500, null)).toBeNull()
    expect(memoryUsageShares(100, 500, 0)).toBeNull()
  })
})

describe('resolveUsageStatus', () => {
  const shares = { pm2: 10, other: 20 }

  test('reports loading while either source is pending', () => {
    expect(resolveUsageStatus('loading', 'success', shares)).toBe('loading')
    expect(resolveUsageStatus('success', 'idle', shares)).toBe('loading')
  })

  test('reports empty for errors or missing shares', () => {
    expect(resolveUsageStatus('error', 'success', shares)).toBe('empty')
    expect(resolveUsageStatus('success', 'error', shares)).toBe('empty')
    expect(resolveUsageStatus('success', 'success', null)).toBe('empty')
  })

  test('reports ready when both sources succeeded', () => {
    expect(resolveUsageStatus('success', 'success', shares)).toBe('ready')
  })
})
