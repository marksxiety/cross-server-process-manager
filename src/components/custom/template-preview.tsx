import { Terminal } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProcessTemplate } from '@/types/template'

type TemplatePreviewProps = {
  template: ProcessTemplate
  className?: string
}

export function TemplatePreview({ template, className }: TemplatePreviewProps) {
  if (!template.preview) return null

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md border bg-muted/40 px-2 py-1.5',
        className,
      )}
    >
      <Terminal className='size-3 shrink-0 text-muted-foreground' strokeWidth={2} />
      <code
        className='min-w-0 truncate font-mono text-[0.6875rem] text-foreground/80'
        title={template.preview}
      >
        {template.preview}
      </code>
    </div>
  )
}
