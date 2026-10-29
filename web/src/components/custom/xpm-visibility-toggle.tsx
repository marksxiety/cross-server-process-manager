import { Eye, EyeOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Toggle } from '@/components/ui/toggle'

export type XpmVisibilityToggleProps = {
  hidden: boolean
  count: number
  onChange: (hidden: boolean) => void
}

export function XpmVisibilityToggle({
  hidden,
  count,
  onChange,
}: XpmVisibilityToggleProps) {
  return (
    <Toggle
      variant='outline'
      size='sm'
      pressed={!hidden}
      onPressedChange={(pressed) => onChange(!pressed)}
      aria-label={hidden ? 'Show XPM processes' : 'Hide XPM processes'}
      title={hidden ? 'Show XPM processes' : 'Hide XPM processes'}
      className='gap-1.5'
    >
      {hidden ? <EyeOff strokeWidth={2} /> : <Eye strokeWidth={2} />}
      XPM
      {count > 0 && (
        <Badge variant='secondary' className='px-1.5 tabular-nums'>
          {count}
        </Badge>
      )}
    </Toggle>
  )
}
