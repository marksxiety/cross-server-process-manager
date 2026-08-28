import type { ReactNode } from "react"
import { Skeleton } from "@/components/ui/skeleton"

interface TileContainerProps {
  children: ReactNode
  isLoading?: boolean
}

const SKELETON_COUNT = 3

export function TileContainer({ children, isLoading = false }: TileContainerProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4 w-full">
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-lg bg-muted/40" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4 w-full">
      {children}
    </div>
  )
}
