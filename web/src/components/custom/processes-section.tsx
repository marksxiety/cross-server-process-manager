import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { EyeOff, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Separator } from '@/components/ui/separator'
import { PageLoader } from '@/components/custom/page-loader'
import { ProcessDetailsSheet } from '@/components/custom/process-details-sheet'
import type { ProcessSelection } from '@/components/custom/process-details-sheet'
import { ProcessGrid } from '@/components/custom/process-grid'
import { ProcessSearchInput } from '@/components/custom/process-search-input'
import { ProcessSortMenu } from '@/components/custom/process-sort-menu'
import { XpmVisibilityToggle } from '@/components/custom/xpm-visibility-toggle'
import { useAccess } from '@/hooks/use-access'
import {
  filterProcessItemsByQuery,
  partitionXpmProcesses,
} from '@/lib/process-filter'
import { sortProcesses } from '@/lib/sort-processes'
import type { ProcessListItem, ProcessSortKey } from '@/lib/sort-processes'
import { cn } from '@/lib/utils'
import { useDashboardStore } from '@/stores/dashboard.store'
import type { ServerProcesses } from '@/types/dashboard'

export type ProcessesSectionProps = {
  items: readonly ProcessListItem[]
  processesByServer: Record<string, ServerProcesses>
  /** True while the processes backing `items` are still loading. */
  isLoading: boolean
  /** True when the request backing `items` failed. */
  isError: boolean
  /** Rendered when no process can be shown and no filter state applies. */
  empty: ReactNode
  loadingDescription: string
  className?: string
  gridClassName?: string
}

export function ProcessesSection({
  items,
  processesByServer,
  isLoading,
  isError,
  empty,
  loadingDescription,
  className,
  gridClassName,
}: ProcessesSectionProps) {
  const hideXpmProcesses = useDashboardStore((state) => state.hideXpmProcesses)
  const setHideXpmProcesses = useDashboardStore(
    (state) => state.setHideXpmProcesses,
  )
  const sortOrder = useDashboardStore((state) => state.sortOrder)
  const setSortOrder = useDashboardStore((state) => state.setSortOrder)
  const access = useAccess()

  const [searchQuery, setSearchQuery] = useState('')
  const [selection, setSelection] = useState<ProcessSelection | null>(null)

  const { standard: standardProcessItems, xpm: xpmProcessItems } = useMemo(
    () => partitionXpmProcesses(items),
    [items],
  )

  const visibleBaseItems = hideXpmProcesses ? standardProcessItems : items
  const query = searchQuery.trim().toLowerCase()

  const searchedProcessItems = useMemo(
    () => filterProcessItemsByQuery(visibleBaseItems, searchQuery),
    [visibleBaseItems, searchQuery],
  )

  const sortedProcessItems = useMemo(
    () => sortProcesses(searchedProcessItems, sortOrder),
    [searchedProcessItems, sortOrder],
  )

  const toggleSortKey = (key: ProcessSortKey) => {
    if (sortOrder.includes(key)) {
      setSortOrder(sortOrder.filter((item) => item !== key))
      return
    }
    // Re-checking status keeps it first so the menu numbering matches the sort.
    setSortOrder(key === 'status' ? [key, ...sortOrder] : [...sortOrder, key])
  }

  const showProcessesLoader = isLoading && sortedProcessItems.length === 0

  return (
    <section aria-label='Processes' className={cn('min-w-0', className)}>
      <div className='flex flex-wrap items-center gap-3'>
        <p className='shrink-0 text-xs font-medium text-muted-foreground'>
          {showProcessesLoader
            ? 'Loading…'
            : `Processes (${sortedProcessItems.length}${
                query !== '' ? `/${visibleBaseItems.length}` : ''
              })`}
        </p>
        <Separator className='flex-1' />
        <div className='flex shrink-0 items-center gap-2'>
          <XpmVisibilityToggle
            hidden={hideXpmProcesses}
            count={xpmProcessItems.length}
            onChange={setHideXpmProcesses}
          />
          <ProcessSortMenu sortOrder={sortOrder} onToggle={toggleSortKey} />
        </div>
        <ProcessSearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder='Search name or namespace…'
          ariaLabel='Search processes by name or namespace'
        />
      </div>

      {sortedProcessItems.length > 0 ? (
        <ProcessGrid
          items={sortedProcessItems}
          processesByServer={processesByServer}
          gridClassName={gridClassName}
          onSelect={
            access.isAuthenticated
              ? (item) =>
                  setSelection({
                    server: item.server,
                    process: item.process,
                  })
              : undefined
          }
        />
      ) : showProcessesLoader ? (
        <PageLoader
          className='min-h-[40vh]'
          title='Loading processes…'
          description={loadingDescription}
        />
      ) : isError ? (
        empty
      ) : query !== '' ? (
        <Empty className='mt-4'>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <Search strokeWidth={2} />
            </EmptyMedia>
            <EmptyTitle>No matching processes</EmptyTitle>
            <EmptyDescription>
              {`No process name or namespace matches “${searchQuery.trim()}”.`}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant='outline' onClick={() => setSearchQuery('')}>
              Clear search
            </Button>
          </EmptyContent>
        </Empty>
      ) : hideXpmProcesses && xpmProcessItems.length > 0 ? (
        <Empty className='mt-4'>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <EyeOff strokeWidth={2} />
            </EmptyMedia>
            <EmptyTitle>XPM processes hidden</EmptyTitle>
            <EmptyDescription>
              {`All ${xpmProcessItems.length} processes in this view belong to the XPM namespace.`}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant='outline' onClick={() => setHideXpmProcesses(false)}>
              Show XPM processes
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        empty
      )}

      <ProcessDetailsSheet
        selection={selection}
        onClose={() => setSelection(null)}
      />
    </section>
  )
}
