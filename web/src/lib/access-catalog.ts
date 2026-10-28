export const IMPLICIT_PAGE_KEY = 'dashboard' as const

export const PAGE_KEYS = [
  'process',
  'templates',
  'servers',
  'server_metrics',
] as const

export const EVENT_KEYS = [
  'process.start',
  'process.stop',
  'process.restart',
  'process.reload',
  'process.delete',
  'logs.flush',
  'server.create',
  'server.update',
  'server.delete',
  'template.create',
  'template.update',
  'template.delete',
] as const

export type PageKey = typeof IMPLICIT_PAGE_KEY | (typeof PAGE_KEYS)[number]
export type EventKey = (typeof EVENT_KEYS)[number]

export interface AccessUser {
  is_admin: boolean
  pages: readonly string[]
  events: readonly string[]
}

export const GUEST_PAGE_KEYS: PageKey[] = [IMPLICIT_PAGE_KEY, 'server_metrics']

export const PAGE_NAMES: Record<PageKey, string> = {
  [IMPLICIT_PAGE_KEY]: 'Dashboard',
  process: 'Process',
  templates: 'Templates',
  servers: 'Servers',
  server_metrics: 'Server Metrics',
}

export const EVENT_NAMES: Record<EventKey, string> = {
  'process.start': 'Start process',
  'process.stop': 'Stop process',
  'process.restart': 'Restart process',
  'process.reload': 'Reload process',
  'process.delete': 'Delete process',
  'logs.flush': 'Flush logs',
  'server.create': 'Create server',
  'server.update': 'Update server',
  'server.delete': 'Delete server',
  'template.create': 'Create template',
  'template.update': 'Update template',
  'template.delete': 'Delete template',
}

export function hasPageAccess(user: AccessUser, page: PageKey): boolean {
  return user.is_admin || page === IMPLICIT_PAGE_KEY || user.pages.includes(page)
}

export function hasEventAccess(user: AccessUser, event: EventKey): boolean {
  return user.is_admin || user.events.includes(event)
}

export function canGuestVisit(page: PageKey): boolean {
  return GUEST_PAGE_KEYS.includes(page)
}
