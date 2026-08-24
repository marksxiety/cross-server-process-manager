import { Tile } from '@/components/custom/Tile'
import { TileContainer } from '@/components/custom/TileContainer'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import type { ProcessInfo } from '@/types'
import processes from '@/data.json'

export function Dashboard() {
  const processList = processes as ProcessInfo[]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {processList.length} process{processList.length === 1 ? '' : 'es'}
          </span>
          <Button size="sm">
            <Plus className="size-4" />
            Add Process
          </Button>
        </div>
      </div>
      <TileContainer>
        {processList.map((process) => (
          <Tile key={process.pid} process={process} />
        ))}
      </TileContainer>
    </div>
  )
}
