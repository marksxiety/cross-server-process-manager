import { Lock, Wand2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { ProcessTemplate } from '@/types/template'

type TemplateCardProps = {
  template: ProcessTemplate
  onUse: (template: ProcessTemplate) => void
}

const MAX_PREVIEW = 8

export function TemplateCard({ template, onUse }: TemplateCardProps) {
  const visible = template.keys.filter((key) => !key.is_hidden)
  const locked = template.keys.filter((key) => key.is_locked).length
  const hidden = template.keys.filter((key) => key.is_hidden).length
  const preview = visible.slice(0, MAX_PREVIEW)
  const overflow = visible.length - preview.length

  return (
    <Card className={cn(!template.is_active && 'opacity-60')}>
      <CardHeader>
        <CardTitle>{template.template_name}</CardTitle>
        <CardDescription className='line-clamp-2'>
          {template.description ?? 'No description'}
        </CardDescription>
        <CardAction>
          <Badge variant='outline' className='font-normal text-muted-foreground'>
            {template.category ?? 'Uncategorized'}
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent className='space-y-2'>
        <p className='text-xs text-muted-foreground'>
          {template.keys.length} fields · {locked} locked · {hidden} hidden
        </p>
        <div className='flex flex-wrap gap-1'>
          {preview.map((key) => (
            <span
              key={key.property_key}
              className='inline-flex items-center gap-1 rounded border bg-muted/40 px-1.5 py-0.5 font-mono text-[0.625rem] text-muted-foreground'
            >
              {key.is_locked && <Lock className='size-2.5' strokeWidth={2.5} />}
              {key.property_key}
            </span>
          ))}
          {overflow > 0 && (
            <span className='px-1 text-[0.625rem] text-muted-foreground'>+{overflow}</span>
          )}
        </div>
      </CardContent>

      <CardFooter className='mt-auto'>
        <Button size='sm' className='w-full' onClick={() => onUse(template)}>
          <Wand2 strokeWidth={2} />
          Use template
        </Button>
      </CardFooter>
    </Card>
  )
}
