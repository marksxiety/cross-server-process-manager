import { describe, expect, test } from 'vitest'
import {
  filterProcessItemsByQuery,
  isXpmProcess,
  partitionXpmProcesses,
} from '../../lib/process-filter'
import type { ProcessListItem } from '../../lib/sort-processes'
import type { ProcessSummary } from '../../types/process'
import type { RegisteredServer } from '../../types/server'

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

function makeItem(process: ProcessSummary): ProcessListItem {
  const server: RegisteredServer = {
    id: 1,
    server: 'alpha',
    protocol: 'http',
    host: '10.0.0.1',
    port: 9000,
    is_active: true,
  }
  return { server, process }
}

describe('isXpmProcess', () => {
  test('matches the XPM namespace', () => {
    expect(isXpmProcess(makeProcess({ namespace: 'XPM' }))).toBe(true)
  })

  test('matches the namespace case-insensitively and ignoring whitespace', () => {
    expect(isXpmProcess(makeProcess({ namespace: ' xpm ' }))).toBe(true)
  })

  test('does not match another namespace, even when the name starts with xpm-', () => {
    expect(
      isXpmProcess(makeProcess({ name: 'xpm-server', namespace: 'default' })),
    ).toBe(false)
  })
})

describe('partitionXpmProcesses', () => {
  test('splits XPM processes from the rest, preserving order', () => {
    const api = makeItem(makeProcess({ pm_id: 1, namespace: 'default' }))
    const agent = makeItem(makeProcess({ pm_id: 2, namespace: 'XPM' }))
    const worker = makeItem(makeProcess({ pm_id: 3, namespace: 'default' }))
    const web = makeItem(makeProcess({ pm_id: 4, namespace: 'xpm' }))

    const { standard, xpm } = partitionXpmProcesses([api, agent, worker, web])

    expect(standard.map((item) => item.process.pm_id)).toEqual([1, 3])
    expect(xpm.map((item) => item.process.pm_id)).toEqual([2, 4])
  })

  test('returns empty groups for an empty list', () => {
    expect(partitionXpmProcesses([])).toEqual({ standard: [], xpm: [] })
  })
})

describe('filterProcessItemsByQuery', () => {
  const api = makeItem(makeProcess({ pm_id: 1, name: 'api-gateway' }))
  const worker = makeItem(
    makeProcess({ pm_id: 2, name: 'checkout-worker', namespace: 'payments' }),
  )

  test('matches the process name case-insensitively', () => {
    expect(filterProcessItemsByQuery([api, worker], 'API')).toEqual([api])
  })

  test('matches the namespace case-insensitively', () => {
    expect(filterProcessItemsByQuery([api, worker], 'PAYMENTS')).toEqual([worker])
  })

  test('trims the query and treats an empty query as no filter', () => {
    expect(filterProcessItemsByQuery([api, worker], '   ')).toEqual([api, worker])
  })

  test('returns no items when nothing matches', () => {
    expect(filterProcessItemsByQuery([api, worker], 'redis')).toEqual([])
  })
})
