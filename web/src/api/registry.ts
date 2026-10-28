import { createConnection, type Connection } from '@/api/connection'
import { registryTarget } from '@/api/registry-target'
import { notifyUnauthorized } from '@/lib/auth-events'
import { refreshSession } from '@/lib/auth-refresh'
import { getAccessToken } from '@/lib/auth-session'

/** Registry calls made on behalf of a signed-in user. */
export function registryConnection(): Connection {
  return createConnection({
    ...registryTarget(),
    authToken: getAccessToken() ?? undefined,
    refreshAuth: async (staleToken) => {
      const result = await refreshSession(staleToken)
      if (result.status === 'refreshed') return { token: result.session.token }
      return { token: null, terminal: result.status !== 'unreachable' }
    },
    onUnauthorized: notifyUnauthorized,
  })
}

/** Registry calls that are public by contract (login/register). */
export function anonymousRegistryConnection(): Connection {
  return createConnection(registryTarget())
}
