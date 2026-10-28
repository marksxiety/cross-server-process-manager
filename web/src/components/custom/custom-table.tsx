import type { ReactNode } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

/** One shared height for every data table in the app. */
export const TABLE_SCROLL_HEIGHT = 'max-h-[60vh]'

type CustomTableProps = {
  /** Injected <TableHead> cells. */
  head: ReactNode
  /** Injected <TableRow> body rows. */
  children: ReactNode
  /** Cards rendered below the `sm` breakpoint. */
  mobile?: ReactNode
  loading?: boolean
  loadingLabel?: string
  /** Number of columns, used by the single loader row. */
  colSpan: number
  className?: string
}

export function CustomTable({
  head,
  children,
  mobile,
  loading = false,
  loadingLabel = 'Loading…',
  colSpan,
  className,
}: CustomTableProps) {
  const hasMobile = mobile !== undefined

  return (
    <>
      {hasMobile && (
        <div className='space-y-3 sm:hidden'>
          {loading ? (
            <MobileCard>
              <div className='flex h-20 items-center justify-center gap-2 text-sm text-muted-foreground'>
                <Spinner className='size-4' />
                {loadingLabel}
              </div>
            </MobileCard>
          ) : (
            mobile
          )}
        </div>
      )}

      <div className={cn('w-full', hasMobile && 'hidden sm:block')}>
        <ScrollArea
          className={cn(
            'w-full',
            TABLE_SCROLL_HEIGHT,
            '**:data-[slot=scroll-area-viewport]:max-h-[60vh]',
            className,
          )}
        >
          <Table
            containerClassName='overflow-visible'
            className='[&_th]:h-9 [&_th]:px-3 [&_th]:text-[11px] [&_th]:tracking-wide [&_th]:uppercase [&_th]:text-muted-foreground [&_td]:px-3 [&_td]:py-3 [&_tbody_tr:hover]:bg-muted/40'
          >
            <TableHeader className='sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80'>
              <TableRow className='bg-muted/50 hover:bg-muted/50'>
                {head}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={colSpan} className='h-24 text-center'>
                    <span className='inline-flex items-center gap-2 text-sm text-muted-foreground'>
                      <Spinner className='size-4' />
                      {loadingLabel}
                    </span>
                  </TableCell>
                </TableRow>
              ) : (
                children
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    </>
  )
}

/** Standard shell for the mobile card layout. */
export function MobileCard({ children }: { children: ReactNode }) {
  return (
    <div className='rounded-lg bg-card p-3 ring-1 ring-foreground/10'>
      {children}
    </div>
  )
}
