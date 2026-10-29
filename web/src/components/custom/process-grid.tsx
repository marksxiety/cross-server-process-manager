import { useMemo, useRef } from 'react'
import { ProcessCard } from '@/components/custom/process-card'
import { useFlipReorder } from '@/hooks/use-flip-reorder'
import { processItemKey } from '@/lib/sort-processes'
import type { ProcessListItem } from '@/lib/sort-processes'
import { cn } from '@/lib/utils'
import type { ServerProcesses } from '@/types/dashboard'

export type ProcessGridProps = {
  items: readonly ProcessListItem[]
  processesByServer: Record<string, ServerProcesses>
  onSelect?: (item: ProcessListItem) => void
  /** Overrides the responsive column count for narrower page containers. */
  gridClassName?: string
}

export function ProcessGrid({
  items,
  processesByServer,
  onSelect,
  gridClassName,
}: ProcessGridProps) {
  const processGridRef = useRef<HTMLDivElement | null>(null)
  const orderSignature = useMemo(
    () => items.map(processItemKey).join('|'),
    [items],
  )
  useFlipReorder({ containerRef: processGridRef, orderSignature })

  return (
    <div
      ref={processGridRef}
      className={cn(
        'mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5',
        gridClassName,
      )}
    >
      {items.map((item) => {
        const key = processItemKey(item)
        const overview = processesByServer[item.server.server]?.overview
        return (
          <div key={key} data-flip-key={key} className='grid'>
            <ProcessCard
              process={item.process}
              serverLabel={`${item.server.server} · ${item.server.host}:${item.server.port}`}
              totalMemoryBytes={overview?.memory.totalBytes ?? null}
              cpuCores={overview?.cpu.cores ?? null}
              onSelect={onSelect ? () => onSelect(item) : undefined}
            />
          </div>
        )
      })}
    </div>
  )
}
