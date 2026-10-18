import type { KeyboardEvent } from 'react'
import { Wand2 } from 'lucide-react'
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
import { TemplatePreview } from '@/components/custom/template-preview'
import { cn } from '@/lib/utils'
import type { ProcessTemplate } from '@/types/template'

type TemplateCardProps = {
  template: ProcessTemplate
  onOpen: (template: ProcessTemplate) => void
  onUse: (template: ProcessTemplate) => void
}

export function TemplateCard({ template, onOpen, onUse }: TemplateCardProps) {
  const fieldCount = Object.keys(template.values).length

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onOpen(template)
    }
  }

  return (
    <Card
      role='button'
      tabIndex={0}
      onClick={() => onOpen(template)}
      onKeyDown={handleKeyDown}
      className={cn(
        'cursor-pointer transition-colors hover:bg-accent/40',
        !template.is_active && 'opacity-60',
      )}
    >
      <CardHeader>
        <CardTitle className='min-w-0 truncate' title={template.template_name}>
          {template.template_name}
        </CardTitle>
        <CardDescription className='line-clamp-2'>
          {template.description ?? 'No description'}
        </CardDescription>
        <CardAction>
          <Badge
            variant='outline'
            className='max-w-32 truncate font-normal text-muted-foreground'
            title={template.category ?? 'Uncategorized'}
          >
            {template.category ?? 'Uncategorized'}
          </Badge>
        </CardAction>
      </CardHeader>

      <CardContent className='space-y-2'>
        <p className='text-xs text-muted-foreground'>{fieldCount} fields</p>
        <TemplatePreview template={template} />
      </CardContent>

      <CardFooter className='mt-auto'>
        <Button
          size='sm'
          className='w-full'
          onClick={(event) => {
            event.stopPropagation()
            onUse(template)
          }}
        >
          <Wand2 strokeWidth={2} />
          Use template
        </Button>
      </CardFooter>
    </Card>
  )
}
