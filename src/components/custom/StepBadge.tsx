import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface StepBadgeProps {
  active: boolean
  done: boolean
  children: ReactNode
}

export function StepBadge({ active, done, children }: StepBadgeProps) {
  return (
    <div
      className={cn(
        'flex h-[22px] w-[22px] items-center justify-center rounded-full text-xs',
        active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
      )}
    >
      {done ? <Check className='h-3 w-3' /> : children}
    </div>
  )
}