import { useMemo } from 'react'
import { ChevronDown, Filter } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  countActiveProcessFilters,
  DEFAULT_PROCESS_FILTERS,
  toggleProcessFilterValue,
} from '@/lib/process-filter'
import type { ProcessFilters } from '@/lib/process-filter'
import { PROCESS_SORT_OPTIONS } from '@/lib/sort-processes'
import type { ProcessSortKey } from '@/lib/sort-processes'
import { statusLabel } from '@/lib/status-catalog'
import type { EffectiveStatus } from '@/types/process'

type FilterMultiSelectProps<T extends string> = {
  label: string
  allLabel: string
  noneLabel: string
  options: readonly T[]
  selected: readonly T[] | null
  onChange: (selected: T[] | null) => void
  getOptionLabel?: (value: T) => string
}

function unionWithSelection<T>(
  options: readonly T[],
  selected: readonly T[] | null,
): T[] {
  if (selected === null) return [...options]

  const available = new Set(options)
  return [
    ...options,
    ...selected.filter((value) => !available.has(value)),
  ]
}

function selectionSummary<T>(
  selected: readonly T[] | null,
  options: readonly T[],
  allLabel: string,
  noneLabel: string,
  getOptionLabel: (value: T) => string,
): string {
  if (selected === null) return allLabel
  if (selected.length === 0) return noneLabel
  if (selected.length === 1) return getOptionLabel(selected[0])
  if (selected.length === options.length) return allLabel
  return `${selected.length} selected`
}

function FilterMultiSelect<T extends string>({
  label,
  allLabel,
  noneLabel,
  options,
  selected,
  onChange,
  getOptionLabel = (value) => value,
}: FilterMultiSelectProps<T>) {
  const displayOptions = useMemo(
    () => unionWithSelection(options, selected),
    [options, selected],
  )
  const summary = selectionSummary(
    selected,
    displayOptions,
    allLabel,
    noneLabel,
    getOptionLabel,
  )

  return (
    <div className='grid gap-1.5'>
      <p className='text-xs text-muted-foreground'>{label}</p>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant='outline'
              size='sm'
              disabled={displayOptions.length === 0}
              aria-label={`${label}: ${summary}`}
              className='w-full justify-between font-normal'
            />
          }
        >
          <span className='truncate'>{summary}</span>
          <ChevronDown
            className='size-3.5 shrink-0 text-muted-foreground'
            strokeWidth={2}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align='start'
          sideOffset={4}
          aria-label={`Filter by ${label.toLowerCase()}`}
        >
          <DropdownMenuGroup>
            <DropdownMenuCheckboxItem
              checked={selected === null}
              closeOnClick={false}
              onCheckedChange={(checked) => onChange(checked ? null : [])}
            >
              {allLabel}
            </DropdownMenuCheckboxItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {displayOptions.map((option) => (
              <DropdownMenuCheckboxItem
                key={option}
                checked={selected === null || selected.includes(option)}
                closeOnClick={false}
                onCheckedChange={() =>
                  onChange(
                    toggleProcessFilterValue(selected, option, displayOptions),
                  )
                }
              >
                {getOptionLabel(option)}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

export type ProcessControlsDialogProps = {
  servers: readonly string[]
  namespaces: readonly string[]
  statuses: readonly EffectiveStatus[]
  filters: ProcessFilters
  onFiltersChange: (filters: ProcessFilters) => void
  sortOrder: readonly ProcessSortKey[]
  onToggleSort: (key: ProcessSortKey) => void
  hideXpmProcesses: boolean
  xpmCount: number
  onHideXpmProcessesChange: (hidden: boolean) => void
}

export function ProcessControlsDialog({
  servers,
  namespaces,
  statuses,
  filters,
  onFiltersChange,
  sortOrder,
  onToggleSort,
  hideXpmProcesses,
  xpmCount,
  onHideXpmProcessesChange,
}: ProcessControlsDialogProps) {
  const activeFilterCount = countActiveProcessFilters(filters)
  const activeFilterLabel = `${activeFilterCount} active filter${
    activeFilterCount === 1 ? '' : 's'
  }`

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant='outline'
            size='sm'
            aria-label={`Filter and sort processes, ${activeFilterLabel}`}
          />
        }
      >
        <Filter strokeWidth={2} />
        Filter &amp; Sort
        {activeFilterCount > 0 && (
          <Badge variant='secondary' className='px-1.5 tabular-nums'>
            {activeFilterCount}
          </Badge>
        )}
      </DialogTrigger>

      <DialogContent className='max-h-[90dvh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Process filters &amp; sort</DialogTitle>
          <DialogDescription>
            Narrow and order the process list. Changes apply immediately.
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-5 sm:grid-cols-2'>
          <div className='grid content-start gap-4'>
            <p className='text-[0.625rem] font-medium tracking-wider text-muted-foreground uppercase'>
              Filters
            </p>

            <FilterMultiSelect
              label='Servers'
              allLabel='All servers'
              noneLabel='No servers'
              options={servers}
              selected={filters.servers}
              onChange={(selected) =>
                onFiltersChange({ ...filters, servers: selected })
              }
            />

            <FilterMultiSelect
              label='Namespaces'
              allLabel='All namespaces'
              noneLabel='No namespaces'
              options={namespaces}
              selected={filters.namespaces}
              onChange={(selected) =>
                onFiltersChange({ ...filters, namespaces: selected })
              }
            />

            <FilterMultiSelect
              label='Statuses'
              allLabel='All statuses'
              noneLabel='No statuses'
              options={statuses}
              selected={filters.statuses}
              onChange={(selected) =>
                onFiltersChange({ ...filters, statuses: selected })
              }
              getOptionLabel={statusLabel}
            />

            <div className='flex items-center justify-between gap-3 rounded-md border border-border/70 p-3'>
              <div className='min-w-0'>
                <Label htmlFor='include-xpm-processes'>
                  Include XPM processes
                </Label>
                <p className='mt-0.5 text-[11px] text-muted-foreground'>
                  {xpmCount === 0
                    ? 'No XPM processes loaded.'
                    : `${xpmCount} XPM namespace process${
                        xpmCount === 1 ? '' : 'es'
                      }.`}
                </p>
              </div>
              <Switch
                id='include-xpm-processes'
                checked={!hideXpmProcesses}
                onCheckedChange={(checked) =>
                  onHideXpmProcessesChange(!checked)
                }
              />
            </div>
          </div>

          <div className='grid content-start gap-2 sm:border-l sm:pl-5'>
            <p className='text-[0.625rem] font-medium tracking-wider text-muted-foreground uppercase'>
              Sort order
            </p>
            <p className='mb-1 text-[11px] text-muted-foreground'>
              Checked criteria sort in the numbered order shown.
            </p>

            <div className='grid gap-0.5'>
              {PROCESS_SORT_OPTIONS.map((option) => {
                const index = sortOrder.indexOf(option.value)
                return (
                  <Label
                    key={option.value}
                    htmlFor={`process-sort-${option.value}`}
                    className='cursor-pointer gap-2 rounded-md px-2 py-1.5 font-normal hover:bg-accent/60'
                  >
                    <Checkbox
                      id={`process-sort-${option.value}`}
                      checked={index !== -1}
                      onCheckedChange={() => onToggleSort(option.value)}
                    />
                    <span className='flex-1'>{option.label}</span>
                    {index !== -1 && (
                      <Badge
                        variant='secondary'
                        aria-hidden='true'
                        className='px-1.5 tabular-nums'
                      >
                        {index + 1}
                      </Badge>
                    )}
                  </Label>
                )
              })}
            </div>
          </div>
        </div>

        <DialogFooter className='flex-row items-center justify-between'>
          <Button
            variant='ghost'
            onClick={() => onFiltersChange(DEFAULT_PROCESS_FILTERS)}
            disabled={activeFilterCount === 0}
          >
            Reset filters
          </Button>
          <DialogClose render={<Button />}>Done</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
