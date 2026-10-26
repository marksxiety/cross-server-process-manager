import { createConnection, type Connection } from '@/api/connection'
import { getAccessToken } from '@/lib/auth-session'

function registryTarget() {
  return {
    protocol: import.meta.env.VITE_SERVER_PROTOCOL as 'http' | 'https',
    host: import.meta.env.VITE_SERVER_HOST,
    port: Number(import.meta.env.VITE_SERVER_PORT),
  }
}

/** Registry calls made on behalf of a signed-in user. */
export function registryConnection(): Connection {
  return createConnection({
    ...registryTarget(),
    authToken: getAccessToken() ?? undefined,
  })
}

/** Registry calls that are public by contract (login/register). */
export function anonymousRegistryConnection(): Connection {
  return createConnection(registryTarget())
}
