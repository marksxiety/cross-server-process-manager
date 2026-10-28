import type { AuditEntry } from '@/types/audit'

const ACTION_LABELS: Record<string, string> = {
  login: 'Login',
  login_failed: 'Login failed',
  logout: 'Logout',
  register: 'Registration requested',
  resend_verification: 'Verification resent',
  verify_email: 'Email verified',
  request_password_reset: 'Password reset requested',
  password_changed: 'Password changed',
  refresh_reuse: 'Refresh token reuse',
  create: 'Create',
  update: 'Update',
  delete: 'Delete',
  start: 'Start',
  stop: 'Stop',
  restart: 'Restart',
  reload: 'Reload',
  flush: 'Flush',
  update_user: 'Update user',
  update_access: 'Update access',
  send_failed: 'Send failed',
}

export interface AuditActor {
  isUser: boolean
  primary: string
  secondary: string | null
}

export function auditActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action
}

export function auditCategoryLabel(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1)
}

export function auditActor(entry: AuditEntry): AuditActor {
  if (entry.user_name || entry.user_email) {
    return {
      isUser: true,
      primary: entry.user_name ?? entry.user_email ?? 'Unknown user',
      secondary: entry.user_name ? entry.user_email : null,
    }
  }

  return {
    isUser: false,
    primary: 'Anonymous',
    secondary: entry.ip_address,
  }
}

export function auditDateParts(value: string): { date: string; time: string } {
  const date = new Date(value)
  return {
    date: date.toLocaleDateString(undefined, {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }),
    time: date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
  }
}

export function auditSearchText(entry: AuditEntry): string {
  const actor = auditActor(entry)
  const { date, time } = auditDateParts(entry.created_at)

  return [
    date,
    time,
    actor.primary,
    actor.secondary,
    entry.user_name,
    entry.user_email,
    entry.ip_address,
    entry.category,
    auditCategoryLabel(entry.category),
    entry.action,
    auditActionLabel(entry.action),
    entry.details,
  ]
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .join(' ')
    .toLowerCase()
}

export function filterAuditEntries(entries: AuditEntry[], query: string): AuditEntry[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return entries
  return entries.filter((entry) => auditSearchText(entry).includes(needle))
}
