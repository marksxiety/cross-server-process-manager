import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { ProcessInfo } from "@/types"

interface TileProps {
  process: ProcessInfo,
  onClick: (process: ProcessInfo) => void
}

export function Tile({ process, onClick }: TileProps) {
  return (
    <Card className="flex h-full flex-col cursor-pointer"
      onClick={() => onClick(process)}>
      <CardHeader>
        <CardTitle>{process.name}</CardTitle>
      </CardHeader>

      <CardContent className="flex-1">
        <p>PID: {process.pid}</p>
        <p>Status: {process.status}</p>
        <p>CPU: {process.cpu}%</p>
        <p>Memory: {process.memory}</p>
      </CardContent>
    </Card>
  )
}