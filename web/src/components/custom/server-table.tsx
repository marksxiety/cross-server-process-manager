import { Pencil, Trash2 } from 'lucide-react'
import { CustomTable, MobileCard } from '@/components/custom/custom-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TableCell, TableHead, TableRow } from '@/components/ui/table'
import type { RegisteredServer } from '@/types/server'

type ServerTableProps = {
  servers: RegisteredServer[]
  onEdit: (server: RegisteredServer) => void
  onDelete: (server: RegisteredServer) => void
  canEdit: boolean
  canDelete: boolean
  loading?: boolean
}

export function ServerTable({
  servers,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
  loading = false,
}: ServerTableProps) {
  const showActions = canEdit || canDelete

  const cards = servers.map((server) => (
    <MobileCard key={server.id}>
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <p className='truncate text-sm font-medium' title={server.server}>
            {server.server}
          </p>
          <p
            className='truncate font-mono text-xs text-muted-foreground'
            title={`${server.host}:${server.port}`}
          >
            {server.host}:{server.port}
          </p>
        </div>
        <Badge
          variant={server.is_active ? 'success' : 'secondary'}
          className='shrink-0'
        >
          {server.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      <div className='mt-3 flex items-center justify-between gap-2 border-t pt-3'>
        <Badge variant='outline' className='font-mono text-xs font-normal'>
          {server.protocol.toUpperCase()}
        </Badge>
        <div className='flex gap-1'>
          {canEdit && (
            <Button
              type='button'
              variant='ghost'
              size='icon-sm'
              aria-label={`Edit ${server.server}`}
              title={`Edit ${server.server}`}
              onClick={() => onEdit(server)}
            >
              <Pencil strokeWidth={2} />
            </Button>
          )}
          {canDelete && (
            <Button
              type='button'
              variant='ghost'
              size='icon-sm'
              aria-label={`Delete ${server.server}`}
              title={`Delete ${server.server}`}
              onClick={() => onDelete(server)}
            >
              <Trash2 strokeWidth={2} />
            </Button>
          )}
        </div>
      </div>
    </MobileCard>
  ))

  const head = (
    <>
      <TableHead>Server</TableHead>
      <TableHead className='hidden md:table-cell'>Protocol</TableHead>
      <TableHead>Host</TableHead>
      <TableHead className='hidden lg:table-cell'>Port</TableHead>
      <TableHead>Status</TableHead>
      {showActions && (
        <TableHead className='w-0 text-right'>Actions</TableHead>
      )}
    </>
  )

  return (
    <CustomTable
      head={head}
      mobile={cards}
      loading={loading}
      loadingLabel='Loading servers…'
      colSpan={showActions ? 6 : 5}
    >
      {servers.map((server) => (
          <TableRow key={server.id}>
            <TableCell
              className='max-w-48 truncate font-medium'
              title={server.server}
            >
              {server.server}
            </TableCell>
            <TableCell className='hidden md:table-cell'>
              <Badge variant='outline' className='font-mono text-xs font-normal'>
                {server.protocol.toUpperCase()}
              </Badge>
            </TableCell>
            <TableCell
              className='max-w-48 truncate font-mono text-muted-foreground'
              title={server.host}
            >
              {server.host}
            </TableCell>
            <TableCell className='hidden font-mono text-muted-foreground lg:table-cell'>
              {server.port}
            </TableCell>
            <TableCell>
              <Badge variant={server.is_active ? 'success' : 'secondary'}>
                {server.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </TableCell>
            {showActions && (
              <TableCell className='text-right'>
                <div className='flex justify-end gap-1'>
                  {canEdit && (
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon-sm'
                      aria-label={`Edit ${server.server}`}
                      title={`Edit ${server.server}`}
                      onClick={() => onEdit(server)}
                    >
                      <Pencil strokeWidth={2} />
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon-sm'
                      aria-label={`Delete ${server.server}`}
                      title={`Delete ${server.server}`}
                      onClick={() => onDelete(server)}
                    >
                      <Trash2 strokeWidth={2} />
                    </Button>
                  )}
                </div>
              </TableCell>
            )}
          </TableRow>
      ))}
    </CustomTable>
  )
}
