import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export type ProcessSearchInputProps = {
  value: string
  onChange: (value: string) => void
  placeholder: string
  ariaLabel: string
  className?: string
}

export function ProcessSearchInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
  className,
}: ProcessSearchInputProps) {
  return (
    <div className={cn('relative w-full max-w-56 shrink-0', className)}>
      <Search
        className='pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground'
        strokeWidth={2}
      />
      <Input
        size='xs'
        className='pl-7'
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onChange('')
        }}
      />
      {value !== '' && (
        <button
          type='button'
          aria-label='Clear search'
          title='Clear search'
          className='absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground'
          onClick={() => onChange('')}
        >
          <X className='size-3.5' strokeWidth={2} />
        </button>
      )}
    </div>
  )
}
