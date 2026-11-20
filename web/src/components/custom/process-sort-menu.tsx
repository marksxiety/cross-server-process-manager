import { ArrowUpDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PROCESS_SORT_OPTIONS } from '@/lib/sort-processes'
import type { ProcessSortKey } from '@/lib/sort-processes'

export type ProcessSortMenuProps = {
  sortOrder: readonly ProcessSortKey[]
  onToggle: (key: ProcessSortKey) => void
}

export function ProcessSortMenu({ sortOrder, onToggle }: ProcessSortMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant='outline'
            size='sm'
            aria-label={`Sort by, ${sortOrder.length} active`}
          />
        }
      >
        <ArrowUpDown strokeWidth={2} />
        Sort By
        {sortOrder.length > 0 && (
          <Badge variant='secondary' className='px-1.5 tabular-nums'>
            {sortOrder.length}
          </Badge>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-48'>
        <DropdownMenuGroup>
          <DropdownMenuLabel>Sort order</DropdownMenuLabel>
          {PROCESS_SORT_OPTIONS.map((option) => {
            const index = sortOrder.indexOf(option.value)
            return (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={index !== -1}
                closeOnClick={false}
                onCheckedChange={() => onToggle(option.value)}
              >
                {option.label}
                {index !== -1 && (
                  <DropdownMenuShortcut>{index + 1}</DropdownMenuShortcut>
                )}
              </DropdownMenuCheckboxItem>
            )
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
