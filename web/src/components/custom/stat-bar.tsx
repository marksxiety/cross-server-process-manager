import { Progress } from '@/components/ui/progress'
import { toneProgressClasses, toneTextClasses } from '@/lib/status-tone'
import { cn } from '@/lib/utils'
import type { Tone } from '@/types/tone'

type StatBarProps = {
  label: string
  value: number
  tone: Tone
}

export function StatBar({ label, value, tone }: StatBarProps) {
  return (
    <div className='w-40 shrink-0'>
      <div className='mb-0.5 flex justify-between text-xs uppercase tracking-wide text-muted-foreground'>
        <span>{label}</span>
        <span className={cn('font-semibold', toneTextClasses[tone])}>
          {value.toFixed(0)}%
        </span>
      </div>
      <Progress
        value={Math.min(value, 100)}
        className={cn(
          '**:data-[slot=progress-track]:h-1.5',
          toneProgressClasses[tone],
        )}
      />
    </div>
  )
}
