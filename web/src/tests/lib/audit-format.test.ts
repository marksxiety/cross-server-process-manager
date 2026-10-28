import { describe, expect, test } from 'vitest'
import {
  auditActionLabel,
  auditActor,
  auditCategoryLabel,
  auditDateParts,
  auditSearchText,
  filterAuditEntries,
} from '@/lib/audit-format'
import type { AuditEntry } from '@/types/audit'

const USER_ENTRY: AuditEntry = {
  id: 1,
  user_id: 3,
  category: 'server',
  action: 'update',
  details: 'Updated server LOCAL: name LOCAL1 → LOCAL',
  ip_address: '192.168.1.20',
  created_at: '2026-10-28T14:03:11.482Z',
  user_name: 'Alice Cruz',
  user_email: 'alice@corp.local',
}

const ANONYMOUS_ENTRY: AuditEntry = {
  id: 2,
  user_id: null,
  category: 'auth',
  action: 'login_failed',
  details: 'Failed sign-in (invalid credentials)',
  ip_address: '203.0.113.7',
  created_at: '2026-10-28T14:05:00.000Z',
  user_name: null,
  user_email: null,
}

const ENTRIES = [USER_ENTRY, ANONYMOUS_ENTRY]

describe('audit labels', () => {
  test('humanizes actions and categories', () => {
    expect(auditActionLabel('restart')).toBe('Restart')
    expect(auditActionLabel('update_user')).toBe('Update user')
    expect(auditActionLabel('something_else')).toBe('something_else')
    expect(auditCategoryLabel('server')).toBe('Server')
    expect(auditCategoryLabel('auth')).toBe('Auth')
  })
})

describe('auditActor', () => {
  test('resolves a signed-in user', () => {
    expect(auditActor(USER_ENTRY)).toEqual({
      isUser: true,
      primary: 'Alice Cruz',
      secondary: 'alice@corp.local',
    })
  })

  test('falls back to the IP for anonymous events', () => {
    expect(auditActor(ANONYMOUS_ENTRY)).toEqual({
      isUser: false,
      primary: 'Anonymous',
      secondary: '203.0.113.7',
    })
  })
})

describe('auditDateParts', () => {
  test('splits the timestamp into a date and time', () => {
    const parts = auditDateParts(USER_ENTRY.created_at)
    expect(parts.date).toMatch(/2026/)
    expect(parts.time.length).toBeGreaterThan(0)
  })
})

describe('auditSearchText', () => {
  test('includes every displayed column', () => {
    const text = auditSearchText(USER_ENTRY)
    expect(text).toContain('alice cruz')
    expect(text).toContain('alice@corp.local')
    expect(text).toContain('192.168.1.20')
    expect(text).toContain('server')
    expect(text).toContain('update')
    expect(text).toContain('local1')
    expect(text).toContain('2026')
  })
})

describe('filterAuditEntries', () => {
  test('matches name, email, IP, category, action, details and date', () => {
    expect(filterAuditEntries(ENTRIES, 'alice')).toEqual([USER_ENTRY])
    expect(filterAuditEntries(ENTRIES, 'ALICE@CORP.LOCAL')).toEqual([USER_ENTRY])
    expect(filterAuditEntries(ENTRIES, '192.168')).toEqual([USER_ENTRY])
    expect(filterAuditEntries(ENTRIES, 'server')).toEqual([USER_ENTRY])
    expect(filterAuditEntries(ENTRIES, 'update')).toEqual([USER_ENTRY])
    expect(filterAuditEntries(ENTRIES, 'LOCAL1')).toEqual([USER_ENTRY])
    expect(filterAuditEntries(ENTRIES, 'anonymous')).toEqual([ANONYMOUS_ENTRY])
    expect(filterAuditEntries(ENTRIES, '203.0.113')).toEqual([ANONYMOUS_ENTRY])
    expect(filterAuditEntries(ENTRIES, '2026')).toEqual(ENTRIES)
  })

  test('returns everything for an empty query', () => {
    expect(filterAuditEntries(ENTRIES, '')).toEqual(ENTRIES)
    expect(filterAuditEntries(ENTRIES, '   ')).toEqual(ENTRIES)
  })

  test('returns nothing when no row matches', () => {
    expect(filterAuditEntries(ENTRIES, 'nope')).toEqual([])
  })
})
