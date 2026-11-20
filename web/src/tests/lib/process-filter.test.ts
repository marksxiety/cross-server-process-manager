import { describe, expect, test } from 'vitest'
import {
  countActiveProcessFilters,
  DEFAULT_PROCESS_FILTERS,
  filterProcessItems,
  filterProcessItemsByQuery,
  isXpmNamespace,
  isXpmProcess,
  partitionXpmProcesses,
  sanitizeProcessFilters,
  toggleProcessFilterValue,
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

function makeItem(
  process: ProcessSummary,
  serverOverrides: Partial<RegisteredServer> = {},
): ProcessListItem {
  const server: RegisteredServer = {
    id: 1,
    server: 'alpha',
    protocol: 'http',
    host: '10.0.0.1',
    port: 9000,
    is_active: true,
    ...serverOverrides,
  }
  return { server, process }
}

describe('isXpmNamespace', () => {
  test('matches the XPM namespace case-insensitively and ignoring whitespace', () => {
    expect(isXpmNamespace('XPM')).toBe(true)
    expect(isXpmNamespace(' xpm ')).toBe(true)
  })

  test('does not match another namespace or a missing one', () => {
    expect(isXpmNamespace('default')).toBe(false)
    expect(isXpmNamespace(undefined)).toBe(false)
  })
})

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

describe('filterProcessItems', () => {
  const api = makeItem(makeProcess({ pm_id: 1, namespace: 'default' }))
  const worker = makeItem(
    makeProcess({ pm_id: 2, namespace: 'payments' }),
    { server: 'beta' },
  )
  const stopped = makeItem(
    makeProcess({ pm_id: 3, status: 'stopped', exit_code: 1, autorestart: false }),
    { server: 'beta' },
  )

  test('leaves every category unrestricted when all filters are null', () => {
    expect(filterProcessItems([api, worker, stopped], DEFAULT_PROCESS_FILTERS)).toEqual([
      api,
      worker,
      stopped,
    ])
  })

  test('ORs values within a category', () => {
    expect(
      filterProcessItems([api, worker, stopped], {
        ...DEFAULT_PROCESS_FILTERS,
        servers: ['alpha', 'beta'],
      }),
    ).toEqual([api, worker, stopped])
  })

  test('ANDs categories together', () => {
    expect(
      filterProcessItems([api, worker, stopped], {
        ...DEFAULT_PROCESS_FILTERS,
        servers: ['beta'],
        namespaces: ['payments'],
      }),
    ).toEqual([worker])
  })

  test('filters by the same effective status shown on process cards', () => {
    expect(
      filterProcessItems([api, worker, stopped], {
        ...DEFAULT_PROCESS_FILTERS,
        statuses: ['failed_exit'],
      }),
    ).toEqual([stopped])
  })

  test('an empty category selects nothing', () => {
    expect(
      filterProcessItems([api, worker], {
        ...DEFAULT_PROCESS_FILTERS,
        servers: [],
      }),
    ).toEqual([])
  })
})

describe('toggleProcessFilterValue', () => {
  const options = ['alpha', 'beta', 'gamma']

  test('starts from all options when the selection is unrestricted', () => {
    expect(toggleProcessFilterValue(null, 'beta', options)).toEqual([
      'alpha',
      'gamma',
    ])
  })

  test('adds a value while preserving option order', () => {
    expect(toggleProcessFilterValue(['gamma'], 'alpha', options)).toEqual([
      'alpha',
      'gamma',
    ])
  })

  test('collapses back to unrestricted when every option is selected', () => {
    expect(toggleProcessFilterValue(['alpha', 'gamma'], 'beta', options)).toBeNull()
  })

  test('keeps an empty selection when the last option is removed', () => {
    expect(toggleProcessFilterValue(['beta'], 'beta', options)).toEqual([])
  })
})

describe('countActiveProcessFilters', () => {
  test('counts each narrowed category once', () => {
    expect(
      countActiveProcessFilters({
        servers: ['alpha'],
        namespaces: [],
        statuses: null,
      }),
    ).toBe(2)
  })

  test('is zero when nothing is filtered', () => {
    expect(countActiveProcessFilters(DEFAULT_PROCESS_FILTERS)).toBe(0)
  })
})

describe('sanitizeProcessFilters', () => {
  test('falls back to unrestricted categories for invalid input', () => {
    expect(sanitizeProcessFilters('nope')).toEqual(DEFAULT_PROCESS_FILTERS)
  })

  test('drops invalid values and duplicates', () => {
    expect(
      sanitizeProcessFilters({
        servers: ['alpha', 'alpha', 42],
        namespaces: ['payments', ''],
        statuses: ['online', 'not-a-status', 'online'],
      }),
    ).toEqual({
      servers: ['alpha'],
      namespaces: ['payments'],
      statuses: ['online'],
    })
  })
})
