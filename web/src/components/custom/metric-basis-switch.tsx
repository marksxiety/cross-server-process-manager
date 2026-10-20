import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { MetricBasis } from '@/types/prometheus'

type MetricBasisSwitchProps = {
  value: MetricBasis
  onChange: (value: MetricBasis) => void
  label: string
}

const OPTIONS: Array<{ value: MetricBasis; label: string }> = [
  { value: 'server', label: 'SERVER' },
  { value: 'process', label: 'PROCESS' },
]

export function MetricBasisSwitch({
  value,
  onChange,
  label,
}: MetricBasisSwitchProps) {
  return (
    <div
      role='group'
      aria-label={label}
      className='inline-flex items-center gap-0.5 rounded-md bg-muted/60 p-0.5 ring-1 ring-border/50'
    >
      {OPTIONS.map((option) => (
        <Button
          key={option.value}
          type='button'
          variant='ghost'
          size='xs'
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'h-6 px-1.5 text-[10px] font-medium tracking-wide',
            value === option.value
              ? 'bg-background text-foreground shadow-sm ring-1 ring-border hover:bg-background'
              : 'text-muted-foreground',
          )}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}
