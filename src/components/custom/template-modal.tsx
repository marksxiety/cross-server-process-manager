import { useMemo, useState } from 'react'
import { Check, Copy, Trash2, Wand2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { buildTemplatePayload } from '@/lib/template-payload'
import type { ProcessTemplate, TemplateDataType, TemplateKey } from '@/types/template'

type TemplateModalProps = {
  template: ProcessTemplate
  open: boolean
  onOpenChange: (open: boolean) => void
  onUse: (template: ProcessTemplate) => void
}

const DATA_TYPES: TemplateDataType[] = ['string', 'boolean', 'number', 'array', 'object']

function newKey(): TemplateKey {
  return {
    property_key: '',
    property_value: '',
    data_type: 'string',
    is_required: false,
    is_hidden: false,
    is_locked: false,
  }
}

export function TemplateModal({ template, open, onOpenChange, onUse }: TemplateModalProps) {
  const [keys, setKeys] = useState<TemplateKey[]>(template.keys)
  const [copied, setCopied] = useState(false)

  const payload = useMemo(() => buildTemplatePayload(keys), [keys])
  const payloadJson = useMemo(() => JSON.stringify(payload, null, 2), [payload])

  const updateKey = (index: number, patch: Partial<TemplateKey>) => {
    setKeys((prev) => prev.map((key, i) => (i === index ? { ...key, ...patch } : key)))
  }

  const removeKey = (index: number) => {
    setKeys((prev) => prev.filter((_, i) => i !== index))
  }

  const addKey = () => {
    setKeys((prev) => [...prev, newKey()])
  }

  const copyPayload = async () => {
    await navigator.clipboard.writeText(payloadJson)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-5xl'>
        <DialogHeader className='pr-6'>
          <DialogTitle>{template.template_name}</DialogTitle>
          {template.category && (
            <Badge variant='outline' className='w-fit font-normal text-muted-foreground'>
              {template.category}
            </Badge>
          )}
        </DialogHeader>

        <div className='grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]'>
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                Keys
              </p>
              <Button type='button' variant='outline' size='sm' onClick={addKey}>
                + Add key
              </Button>
            </div>

            <ScrollArea className='max-h-105 [&_[data-slot=scroll-area-viewport]]:max-h-105'>
              <div className='space-y-2 pr-3'>
                {keys.map((key, index) => (
                  <div key={index} className='flex items-center gap-2'>
                    <Input
                      className='font-mono text-xs'
                      placeholder='key'
                      value={key.property_key}
                      onChange={(event) => updateKey(index, { property_key: event.target.value })}
                    />
                    <Input
                      className='font-mono text-xs'
                      placeholder='value'
                      value={key.property_value ?? ''}
                      onChange={(event) => updateKey(index, { property_value: event.target.value })}
                    />
                    <Select
                      value={key.data_type}
                      onValueChange={(value) =>
                        updateKey(index, { data_type: value as TemplateDataType })
                      }
                    >
                      <SelectTrigger className='w-28 shrink-0'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DATA_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <label className='flex shrink-0 items-center gap-1 text-xs text-muted-foreground'>
                      <Checkbox
                        checked={key.is_required}
                        onCheckedChange={(checked) =>
                          updateKey(index, { is_required: checked === true })
                        }
                      />
                      req
                    </label>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon-sm'
                      aria-label={`Remove ${key.property_key || 'key'}`}
                      title='Remove key'
                      onClick={() => removeKey(index)}
                    >
                      <X strokeWidth={2} />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className='space-y-2'>
            <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
              Payload preview
            </p>
            <pre className='max-h-105 overflow-auto rounded-md border bg-muted p-3 font-mono text-[11px] leading-relaxed'>
              {payloadJson}
            </pre>
            <Button
              type='button'
              variant='outline'
              className='w-full'
              onClick={() => void copyPayload()}
            >
              {copied ? (
                <Check className='mr-1 h-3.5 w-3.5' />
              ) : (
                <Copy className='mr-1 h-3.5 w-3.5' />
              )}
              {copied ? 'Copied' : 'Copy JSON'}
            </Button>
          </div>
        </div>

        <DialogFooter className='sm:justify-between'>
          <Button
            type='button'
            onClick={() => {
              onUse(template)
              onOpenChange(false)
            }}
          >
            <Wand2 strokeWidth={2} />
            Use template
          </Button>
          <div className='flex gap-2'>
            <Button type='button' variant='destructive'>
              <Trash2 strokeWidth={2} />
              Delete
            </Button>
            <Button type='button'>Save</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
