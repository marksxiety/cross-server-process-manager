import type { ReactNode } from "react"
import { Skeleton } from "@/components/ui/skeleton"

export interface TileContainerProps {
  children: ReactNode
  isLoading?: boolean
}

export function TileContainer({ children, isLoading = false }: TileContainerProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 w-full">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-35 w-full rounded-xl bg-muted/40" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 w-full">
      {children}
    </div>
  )
}