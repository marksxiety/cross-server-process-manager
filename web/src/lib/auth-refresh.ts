import { createConnection } from '@/api/connection'
import { registryTarget } from '@/api/registry-target'
import { isDemoMode } from '@/lib/demo-mode'
import { readSession, writeSession, type StoredSession } from '@/lib/auth-session'
import type { AuthSessionPayload } from '@/types/auth'

export type RefreshResult =
  | { status: 'refreshed'; session: StoredSession }
  | { status: 'expired' }
  | { status: 'rejected'; statusCode: number; code?: string }
  | { status: 'unreachable' }
  | { status: 'missing' }

const REFRESH_LOCK_NAME = 'xpm.auth.refresh'
const RACE_RETRY_MS = 250
const RACE_RETRIES = 2

let inFlight: Promise<RefreshResult> | null = null

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms))
}

function refreshed(session: StoredSession): RefreshResult {
  return { status: 'refreshed', session }
}

function lockManager(): LockManager | null {
  if (typeof navigator === 'undefined') return null
  return (navigator as Navigator & { locks?: LockManager }).locks ?? null
}

async function performRefresh(): Promise<RefreshResult> {
  const current = readSession()
  if (!current) return { status: 'missing' }

  const connection = createConnection(registryTarget())

  for (let attempt = 0; attempt <= RACE_RETRIES; attempt += 1) {
    let response
    try {
      response = await connection.post<AuthSessionPayload>('/auth/refresh', {
        refresh_token: current.refreshToken,
      })
    } catch (error) {
      console.warn('auth-refresh: could not reach the registry', error)
      return { status: 'unreachable' }
    }

    if (response.success && response.info) {
      return refreshed(writeSession(response.info))
    }

    // Another tab is rotating the same token. Wait for it to persist the new
    // session, then reuse that instead of tripping reuse detection.
    if (
      response.status === 401 &&
      response.code === 'REFRESH_IN_PROGRESS' &&
      attempt < RACE_RETRIES
    ) {
      await sleep(RACE_RETRY_MS)
      const latest = readSession()
      if (!latest) return { status: 'missing' }
      if (latest.refreshToken !== current.refreshToken || latest.token !== current.token) {
        return refreshed(latest)
      }
      continue
    }

    if (response.status === 401 && response.code === 'REFRESH_IN_PROGRESS') {
      // Still racing after the retries; keep the session and let the next
      // request or timer try again instead of signing the user out.
      return { status: 'unreachable' }
    }
    if (response.status === 401) return { status: 'expired' }
    if (response.status === 403) {
      return { status: 'rejected', statusCode: response.status, code: response.code }
    }
    return { status: 'unreachable' }
  }

  return { status: 'unreachable' }
}

async function withRefreshLock(): Promise<RefreshResult> {
  const locks = lockManager()
  if (!locks) return performRefresh()
  return locks.request(REFRESH_LOCK_NAME, () => performRefresh())
}

/**
 * Rotates the stored refresh token. All callers share one in-flight request so
 * concurrent 401s and tabs do not race each other.
 *
 * `expectedToken` is the access token that just failed. If storage already
 * holds a different one, another tab refreshed first and we reuse it.
 */
export function refreshSession(expectedToken?: string): Promise<RefreshResult> {
  if (isDemoMode()) return Promise.resolve({ status: 'unreachable' })

  const current = readSession()
  if (!current) return Promise.resolve({ status: 'missing' })

  if (expectedToken !== undefined && current.token !== expectedToken) {
    return Promise.resolve(refreshed(current))
  }

  if (inFlight) return inFlight

  const run = withRefreshLock()
  inFlight = run
  void run.finally(() => {
    if (inFlight === run) inFlight = null
  })
  return run
}
