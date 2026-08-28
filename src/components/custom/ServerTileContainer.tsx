import { Skeleton } from '@/components/ui/skeleton'
import type { ServerInfo } from '@/types'
import { ServerTile } from './ServerTile'

export interface ServerTileContainerProps {
  servers: ServerInfo[]
  onServerClick?: (server: ServerInfo) => void
  isLoading?: boolean
  errors?: Record<string, string>
}

export function ServerTileContainer({ 
  servers, 
  onServerClick, 
  isLoading = false, 
  errors 
}: ServerTileContainerProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-18 rounded-lg bg-muted/40" />
        ))}
      </div>
    )
  }

  if (servers.length === 0) return null

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {servers.map((server) => (
        <ServerTile
          key={server.id}
          server={server}
          onClick={onServerClick}
          error={errors?.[server.id]}
        />
      ))}
    </div>
  )
}