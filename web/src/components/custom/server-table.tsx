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
    <Table>
      <TableHeader>
        <TableRow className='bg-muted/50'>
          <TableHead>Server</TableHead>
          <TableHead>Protocol</TableHead>
          <TableHead>Host</TableHead>
          <TableHead>Port</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className='w-0 text-right'>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {servers.map((server) => (
          <TableRow key={server.id}>
            <TableCell className='font-medium'>{server.server}</TableCell>
            <TableCell>
              <Badge variant='outline' className='font-mono text-xs font-normal'>
                {server.protocol.toUpperCase()}
              </Badge>
            </TableCell>
            <TableCell className='font-mono text-muted-foreground'>
              {server.host}
            </TableCell>
            <TableCell className='font-mono text-muted-foreground'>
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
  )
}