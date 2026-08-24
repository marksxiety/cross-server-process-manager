import type { ReactNode } from "react"

interface TileContainerProps {
  children: ReactNode
}

export function TileContainer({ children }: TileContainerProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {children}
    </div>
  )
}