import { Skeleton } from '@/components/ui/skeleton'
import type { ServerInfo } from '@/types'
import { ServerTile } from './ServerTile'

interface ServerTileContainerProps {
  servers: ServerInfo[]
  onServerClick?: (server: ServerInfo) => void
  isLoading?: boolean
  errors?: Record<string, string>
}

const SKELETON_COUNT = 3

export function ServerTileContainer({
  servers,
  onServerClick,
  isLoading = false,
  errors,
}: ServerTileContainerProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2.5">
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-md bg-muted/40" />
        ))}
      </div>
    )
  }

  if (servers.length === 0) return null

  return (
    <div className="grid grid-cols-3 gap-2.5">
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
