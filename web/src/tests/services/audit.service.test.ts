import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('@/api/connection', () => ({
  createConnection: vi.fn(),
}))

vi.mock('@/api/registry-target', () => ({
  registryTarget: vi.fn(() => ({ protocol: 'http', host: 'localhost', port: 5638 })),
}))

vi.mock('@/lib/auth-session', () => ({
  getAccessToken: vi.fn(),
}))

import type { Connection } from '@/api/connection'
import { createConnection } from '@/api/connection'
import { getAccessToken } from '@/lib/auth-session'
import { queueAudit, recordAudit } from '@/api/services/audit.service'

const EVENT = {
  action: 'process.restart' as const,
  server_id: 6,
  pm_id: 12,
  process_name: 'api',
}

function connectionWith(post: ReturnType<typeof vi.fn>): Connection {
  return { get: vi.fn(), post, put: vi.fn(), del: vi.fn() } as unknown as Connection
}

beforeEach(() => {
  vi.mocked(createConnection).mockReset()
  vi.mocked(getAccessToken).mockReset()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('recordAudit', () => {
  test('posts the event with the current access token', () => {
    const post = vi.fn().mockResolvedValue({ success: true, info: null, status: 200 })
    vi.mocked(createConnection).mockReturnValue(connectionWith(post))
    vi.mocked(getAccessToken).mockReturnValue('access-token')

    recordAudit(EVENT)

    expect(createConnection).toHaveBeenCalledWith(
      expect.objectContaining({ authToken: 'access-token' }),
    )
    expect(post).toHaveBeenCalledWith('/audit/events', EVENT)
  })

  test('does nothing without an access token', () => {
    vi.mocked(getAccessToken).mockReturnValue(null)

    recordAudit(EVENT)

    expect(createConnection).not.toHaveBeenCalled()
  })

  test('swallows a failed request', async () => {
    const post = vi.fn().mockRejectedValue(new Error('offline'))
    vi.mocked(createConnection).mockReturnValue(connectionWith(post))
    vi.mocked(getAccessToken).mockReturnValue('access-token')

    expect(() => recordAudit(EVENT)).not.toThrow()
    await Promise.resolve()
  })
})

describe('queueAudit', () => {
  test('defers the request until after the current task', () => {
    vi.useFakeTimers()
    const post = vi.fn().mockResolvedValue({ success: true, info: null, status: 200 })
    vi.mocked(createConnection).mockReturnValue(connectionWith(post))
    vi.mocked(getAccessToken).mockReturnValue('access-token')

    queueAudit(EVENT)
    expect(post).not.toHaveBeenCalled()

    vi.runAllTimers()
    expect(post).toHaveBeenCalledWith('/audit/events', EVENT)
  })
})
