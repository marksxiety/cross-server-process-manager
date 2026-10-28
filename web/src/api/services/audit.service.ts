import { createConnection } from '@/api/connection'
import { registryTarget } from '@/api/registry-target'
import { getAccessToken } from '@/lib/auth-session'

export type AuditAction =
  | 'process.create'
  | 'process.start'
  | 'process.stop'
  | 'process.restart'
  | 'process.reload'
  | 'process.delete'
  | 'logs.flush'

export interface AuditEvent {
  action: AuditAction
  server_id: number
  pm_id: number
  process_name?: string
  stream?: 'all' | 'out' | 'err'
  scope?: 'active' | 'rotated' | 'all'
  bytes_freed?: number
}

/**
 * Fire-and-forget. Uses a bare connection with no refresh/logout side effects,
 * so an audit failure can never affect the user's session or activity.
 */
export function recordAudit(event: AuditEvent): void {
  const token = getAccessToken()
  if (!token) return

  const connection = createConnection({ ...registryTarget(), authToken: token })
  void connection.post('/audit/events', event).catch(() => undefined)
}

/** Runs on the next task so the main UI flow is never blocked. */
export function queueAudit(event: AuditEvent): void {
  globalThis.setTimeout(() => recordAudit(event), 0)
}
