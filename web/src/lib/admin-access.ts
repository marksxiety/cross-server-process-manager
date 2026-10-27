import type { AdminCatalog, AdminCatalogEvent } from '@/types/admin'

export interface AdminActionGroup {
  key: string
  name: string
  events: Array<AdminCatalogEvent & { scope: string }>
}

/** Pages that expose an action, e.g. "Dashboard, Process". */
export function actionScope(eventKey: string, catalog: AdminCatalog): string {
  return catalog.pages
    .filter((page) => page.events.some((event) => event.key === eventKey))
    .map((page) => page.name)
    .join(', ')
}

/**
 * Action rows grouped by their home page. The implicit dashboard is skipped so
 * process/log actions appear once, under Process.
 */
export function buildActionGroups(catalog: AdminCatalog): AdminActionGroup[] {
  return catalog.pages
    .filter((page) => page.key !== catalog.implicit_page && page.events.length > 0)
    .map((page) => ({
      key: page.key,
      name: page.name,
      events: page.events.map((event) => ({
        ...event,
        scope: actionScope(event.key, catalog),
      })),
    }))
}
