import { describe, expect, test } from 'vitest'
import { getSeverityRank, processItemKey, sortProcesses } from '../../lib/sort-processes'
import type { ProcessListItem } from '../../lib/sort-processes'
import type { ProcessSummary } from '../../types/process'
import type { RegisteredServer } from '../../types/server'

function makeServer(overrides: Partial<RegisteredServer> = {}): RegisteredServer {
  return {
    id: 1,
    server: 'alpha',
    protocol: 'http',
    host: '10.0.0.1',
    port: 9000,
    is_active: true,
    ...overrides,
  }
}

function makeProcess(overrides: Partial<ProcessSummary> = {}): ProcessSummary {
  return {
    pid: 100,
    pm_id: 1,
    name: 'api',
    namespace: 'default',
    status: 'online',
    uptime: 1000,
    restarts: 0,
    unstable_restarts: 0,
    exec_mode: 'fork_mode',
    interpreter: 'node',
    cpu: 10,
    memory: 100,
    ip_address: '127.0.0.1',
    watch: false,
    ...overrides,
  }
}

function makeItem(
  serverOverrides: Partial<RegisteredServer> = {},
  processOverrides: Partial<ProcessSummary> = {},
): ProcessListItem {
  return {
    server: makeServer(serverOverrides),
    process: makeProcess(processOverrides),
  }
}

function pmIds(items: readonly ProcessListItem[]): number[] {
  return items.map((item) => item.process.pm_id)
}

describe('sortProcesses', () => {
  test('orders by memory descending', () => {
    const low = makeItem({}, { pm_id: 1, memory: 100 })
    const high = makeItem({}, { pm_id: 2, memory: 900 })
    const mid = makeItem({}, { pm_id: 3, memory: 500 })

    expect(pmIds(sortProcesses([low, high, mid]))).toEqual([2, 3, 1])
  })

  test('falls back to cpu descending when memory is equal', () => {
    const lowCpu = makeItem({}, { pm_id: 1, memory: 100, cpu: 5 })
    const highCpu = makeItem({}, { pm_id: 2, memory: 100, cpu: 80 })

    expect(pmIds(sortProcesses([lowCpu, highCpu]))).toEqual([2, 1])
  })

  test('falls back to host ascending when memory and cpu are equal', () => {
    const laterHost = makeItem({ host: '10.0.0.2' }, { pm_id: 1, memory: 100, cpu: 5 })
    const earlierHost = makeItem({ host: '10.0.0.1' }, { pm_id: 2, memory: 100, cpu: 5 })

    expect(pmIds(sortProcesses([laterHost, earlierHost]))).toEqual([2, 1])
  })

  test('falls back to namespace ascending when server and metrics are equal', () => {
    const prod = makeItem({}, { pm_id: 1, memory: 100, cpu: 5, namespace: 'prod' })
    const dev = makeItem({}, { pm_id: 2, memory: 100, cpu: 5, namespace: 'dev' })

    expect(pmIds(sortProcesses([prod, dev]))).toEqual([2, 1])
  })

  test('falls back to pm_id ascending when namespace is equal', () => {
    const second = makeItem({}, { pm_id: 2, memory: 100, cpu: 5 })
    const first = makeItem({}, { pm_id: 1, memory: 100, cpu: 5 })

    expect(pmIds(sortProcesses([second, first]))).toEqual([1, 2])
  })

  test('closes pm_id ties on port then server name for deterministic order', () => {
    const laterPort = makeItem({ server: 'alpha', port: 9001 }, { pm_id: 1 })
    const earlierPort = makeItem({ server: 'alpha', port: 9000 }, { pm_id: 1 })
    const laterName = makeItem({ server: 'beta', port: 9000 }, { pm_id: 1 })

    expect(pmIds(sortProcesses([laterPort, earlierPort, laterName]))).toEqual([1, 1, 1])
    const ordered = sortProcesses([laterPort, earlierPort, laterName])
    expect(ordered.map((item) => `${item.server.server}:${item.server.port}`)).toEqual([
      'alpha:9000',
      'beta:9000',
      'alpha:9001',
    ])
  })

  test('does not mutate the input array', () => {
    const low = makeItem({}, { pm_id: 1, memory: 100 })
    const high = makeItem({}, { pm_id: 2, memory: 900 })
    const input = [low, high]

    sortProcesses(input)

    expect(input).toEqual([low, high])
  })

  test('honors an explicit primary key over the default memory order', () => {
    const heavyMemoryLowCpu = makeItem({}, { pm_id: 1, memory: 900, cpu: 5 })
    const lightMemoryHighCpu = makeItem({}, { pm_id: 2, memory: 100, cpu: 95 })

    expect(pmIds(sortProcesses([heavyMemoryLowCpu, lightMemoryHighCpu], 'cpu'))).toEqual([2, 1])
  })

  test('sorts by host ascending when host is the primary key', () => {
    const laterHost = makeItem({ host: '10.0.0.2' }, { pm_id: 1, memory: 900 })
    const earlierHost = makeItem({ host: '10.0.0.1' }, { pm_id: 2, memory: 100 })

    expect(pmIds(sortProcesses([laterHost, earlierHost], 'host'))).toEqual([2, 1])
  })

  test('sorts by namespace ascending when namespace is the primary key', () => {
    const prod = makeItem({}, { pm_id: 1, memory: 900, namespace: 'prod' })
    const dev = makeItem({}, { pm_id: 2, memory: 100, namespace: 'dev' })

    expect(pmIds(sortProcesses([prod, dev], 'namespace'))).toEqual([2, 1])
  })

  test('sorts by pm_id ascending when pm_id is the primary key', () => {
    const second = makeItem({}, { pm_id: 2, memory: 900 })
    const first = makeItem({}, { pm_id: 1, memory: 100 })

    expect(pmIds(sortProcesses([second, first], 'pm_id'))).toEqual([1, 2])
  })

  test('falls through the waterfall when the primary key is equal', () => {
    const heavy = makeItem({ host: '10.0.0.9' }, { pm_id: 1, cpu: 50, memory: 900 })
    const light = makeItem({ host: '10.0.0.1' }, { pm_id: 2, cpu: 50, memory: 100 })

    expect(pmIds(sortProcesses([light, heavy], 'cpu'))).toEqual([1, 2])
  })

  test('ranks non-online statuses by severity before any metric', () => {
    const online = makeItem({}, { pm_id: 1, status: 'online', memory: 900 })
    const launching = makeItem({}, { pm_id: 2, status: 'launching', memory: 800 })
    const stopped = makeItem({}, { pm_id: 3, status: 'stopped', memory: 700 })
    const errored = makeItem({}, { pm_id: 4, status: 'errored', memory: 600 })

    expect(pmIds(sortProcesses([online, launching, stopped, errored]))).toEqual([
      4, 3, 2, 1,
    ])
  })

  test('keeps status above the selected primary key', () => {
    const heavyOnline = makeItem({}, { pm_id: 1, status: 'online', memory: 900 })
    const lightStopped = makeItem({}, { pm_id: 2, status: 'stopped', memory: 100 })

    expect(pmIds(sortProcesses([heavyOnline, lightStopped], 'memory'))).toEqual([2, 1])
  })

  test('applies the primary key within the same status group', () => {
    const stoppedSmall = makeItem({}, { pm_id: 1, status: 'stopped', cpu: 5 })
    const onlineHighCpu = makeItem({}, { pm_id: 2, status: 'online', cpu: 95 })
    const stoppedBig = makeItem({}, { pm_id: 3, status: 'stopped', cpu: 80 })

    expect(pmIds(sortProcesses([stoppedSmall, onlineHighCpu, stoppedBig], 'cpu'))).toEqual([
      3, 1, 2,
    ])
  })

  test('prefers namespace over host when earlier keys are equal', () => {
    const laterNamespace = makeItem({ host: '10.0.0.1' }, { pm_id: 1, namespace: 'prod' })
    const earlierNamespace = makeItem({ host: '10.0.0.9' }, { pm_id: 2, namespace: 'dev' })

    expect(pmIds(sortProcesses([laterNamespace, earlierNamespace]))).toEqual([2, 1])
  })
})

describe('getSeverityRank', () => {
  test('ranks errored as most severe', () => {
    expect(getSeverityRank({ status: 'errored' })).toBe(1)
  })

  test('ranks crashed cron/one-shot stops just below errored', () => {
    expect(getSeverityRank({ status: 'stopped', autorestart: false, exit_code: 1 })).toBe(2)
    expect(getSeverityRank({ status: 'stopped', cron_restart: '0 2 * * *', exit_code: 2 })).toBe(2)
  })

  test('ranks a normally stopped service as high severity', () => {
    expect(getSeverityRank({ status: 'stopped' })).toBe(3)
    expect(getSeverityRank({ status: 'stopped', autorestart: true })).toBe(3)
  })

  test('ranks waiting restart as medium', () => {
    expect(getSeverityRank({ status: 'waiting restart' })).toBe(4)
  })

  test('ranks stopping and launching as info', () => {
    expect(getSeverityRank({ status: 'stopping' })).toBe(5)
    expect(getSeverityRank({ status: 'launching' })).toBe(5)
  })

  test('ranks a cleanly finished cron/one-shot stop right above online', () => {
    expect(getSeverityRank({ status: 'stopped', autorestart: false, exit_code: 0 })).toBe(6)
    expect(getSeverityRank({ status: 'stopped', cron_restart: '0 2 * * *', exit_code: 0 })).toBe(6)
  })

  test('ranks healthy and unknown statuses lowest', () => {
    expect(getSeverityRank({ status: 'online' })).toBe(7)
    expect(getSeverityRank({ status: 'one-launch-status' })).toBe(7)
    expect(getSeverityRank({ status: 'unknown' })).toBe(7)
  })
})

describe('processItemKey', () => {
  test('combines server name and pm_id so ids from different servers never collide', () => {
    const item = makeItem({ server: 'beta' }, { pm_id: 7 })

    expect(processItemKey(item)).toBe('beta:7')
  })
})
