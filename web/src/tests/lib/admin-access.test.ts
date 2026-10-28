import { describe, expect, test } from 'vitest'
import { actionScope, buildActionGroups } from '@/lib/admin-access'
import type { AdminCatalog } from '@/types/admin'

const PROCESS_EVENTS = [
  { key: 'process.start', name: 'Start process' },
  { key: 'process.stop', name: 'Stop process' },
  { key: 'logs.flush', name: 'Flush logs' },
]

const CATALOG: AdminCatalog = {
  implicit_page: 'dashboard',
  guest_pages: ['dashboard', 'server_metrics'],
  default_pages: ['server_metrics'],
  default_events: [],
  pages: [
    { key: 'dashboard', name: 'Dashboard', events: PROCESS_EVENTS },
    { key: 'process', name: 'Process', events: PROCESS_EVENTS },
    {
      key: 'templates',
      name: 'Templates',
      events: [{ key: 'template.create', name: 'Create template' }],
    },
    {
      key: 'servers',
      name: 'Servers',
      events: [{ key: 'server.create', name: 'Create server' }],
    },
    { key: 'server_metrics', name: 'Server Metrics', events: [] },
  ],
  events: [
    ...PROCESS_EVENTS,
    { key: 'template.create', name: 'Create template' },
    { key: 'server.create', name: 'Create server' },
  ],
}

describe('actionScope', () => {
  test('lists every page exposing the action', () => {
    expect(actionScope('process.start', CATALOG)).toBe('Dashboard, Process')
    expect(actionScope('server.create', CATALOG)).toBe('Servers')
    expect(actionScope('template.create', CATALOG)).toBe('Templates')
  })
})

describe('buildActionGroups', () => {
  test('groups actions by page and skips dashboard and empty pages', () => {
    const groups = buildActionGroups(CATALOG)

    expect(groups.map((group) => group.key)).toEqual([
      'process',
      'templates',
      'servers',
    ])
    expect(groups[0]?.events[0]).toEqual({
      key: 'process.start',
      name: 'Start process',
      scope: 'Dashboard, Process',
    })
    expect(groups.some((group) => group.key === 'dashboard')).toBe(false)
    expect(groups.some((group) => group.key === 'server_metrics')).toBe(false)
  })
})
