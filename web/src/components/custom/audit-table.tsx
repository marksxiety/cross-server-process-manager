import { Globe } from 'lucide-react'
import { CustomTable, MobileCard } from '@/components/custom/custom-table'
import { Badge } from '@/components/ui/badge'
import { TableCell, TableHead, TableRow } from '@/components/ui/table'
import { UserAvatar } from '@/components/custom/user-avatar'
import {
  auditActionLabel,
  auditActor,
  auditCategoryLabel,
  auditDateParts,
} from '@/lib/audit-format'
import { cn } from '@/lib/utils'
import type { AuditEntry } from '@/types/audit'

function AnonymousAvatar() {
  return (
    <div
      aria-hidden='true'
      className='flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground'
    >
      <Globe className='size-4' strokeWidth={2} />
    </div>
  )
}

function Actor({ entry }: { entry: AuditEntry }) {
  const actor = auditActor(entry)

  return (
    <div className='flex min-w-0 items-center gap-3'>
      {actor.isUser ? (
        <UserAvatar name={actor.primary} />
      ) : (
        <AnonymousAvatar />
      )}
      <div className='min-w-0'>
        <p
          className='max-w-48 truncate text-sm font-medium'
          title={actor.primary}
        >
          {actor.primary}
        </p>
        {actor.secondary && (
          <p
            className={cn(
              'max-w-48 truncate text-xs text-muted-foreground',
              !actor.isUser && 'font-mono',
            )}
            title={actor.secondary}
          >
            {actor.secondary}
          </p>
        )}
      </div>
    </div>
  )
}

function CategoryBadge({ entry }: { entry: AuditEntry }) {
  return (
    <Badge variant='outline' className='font-normal'>
      {auditCategoryLabel(entry.category)}
    </Badge>
  )
}

function AuditCard({ entry }: { entry: AuditEntry }) {
  const { date, time } = auditDateParts(entry.created_at)

  return (
    <MobileCard>
      <div className='flex items-start justify-between gap-3'>
        <Actor entry={entry} />
        <CategoryBadge entry={entry} />
      </div>

      <div className='mt-3 space-y-1 border-t pt-3'>
        <p className='text-xs font-medium'>{auditActionLabel(entry.action)}</p>
        <p className='whitespace-normal break-words text-xs text-muted-foreground'>
          {entry.details ?? '—'}
        </p>
      </div>

      <p className='mt-2 text-[11px] text-muted-foreground'>
        {date} · {time}
      </p>
    </MobileCard>
  )
}

type AuditTableProps = {
  entries: AuditEntry[]
  loading?: boolean
}

export function AuditTable({ entries, loading = false }: AuditTableProps) {
  const cards = entries.map((entry) => (
    <AuditCard key={entry.id} entry={entry} />
  ))

  const head = (
    <>
      <TableHead className='w-36'>When</TableHead>
      <TableHead>Who</TableHead>
      <TableHead className='w-28 text-center'>Category</TableHead>
      <TableHead className='w-28'>Action</TableHead>
      <TableHead>Details</TableHead>
    </>
  )

  return (
    <CustomTable
      head={head}
      mobile={cards}
      loading={loading}
      loadingLabel='Loading audit log…'
      colSpan={5}
    >
      {entries.map((entry) => {
        const { date, time } = auditDateParts(entry.created_at)

        return (
          <TableRow key={entry.id}>
            <TableCell className='align-top tabular-nums'>
              <p className='text-sm font-medium'>{date}</p>
              <p className='text-xs text-muted-foreground'>{time}</p>
            </TableCell>
            <TableCell className='align-top'>
              <Actor entry={entry} />
            </TableCell>
            <TableCell className='text-center'>
              <CategoryBadge entry={entry} />
            </TableCell>
            <TableCell className='align-top text-xs'>
              {auditActionLabel(entry.action)}
            </TableCell>
            <TableCell className='max-w-96 align-top text-xs whitespace-normal break-words text-muted-foreground'>
              {entry.details ?? '—'}
            </TableCell>
          </TableRow>
        )
      })}
    </CustomTable>
  )
}
