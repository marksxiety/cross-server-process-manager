import { Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { RegisteredServer } from '@/types/server'

type ServerTableProps = {
  servers: RegisteredServer[]
  onEdit: (server: RegisteredServer) => void
  onDelete: (server: RegisteredServer) => void
}

export function ServerTable({ servers, onEdit, onDelete }: ServerTableProps) {
  return (
    <>
      <div className='space-y-3 sm:hidden'>
        {servers.map((server) => (
          <div
            key={server.id}
            className='rounded-lg bg-card p-3 ring-1 ring-foreground/10'
          >
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
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className='hidden sm:block'>
        <Table>
          <TableHeader>
            <TableRow className='bg-muted/50'>
              <TableHead>Server</TableHead>
              <TableHead className='hidden md:table-cell'>Protocol</TableHead>
              <TableHead>Host</TableHead>
              <TableHead className='hidden lg:table-cell'>Port</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className='w-0 text-right'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
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
                <TableCell className='text-right'>
                  <div className='flex justify-end gap-1'>
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
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
