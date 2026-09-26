import { useMemo, useState } from 'react'
import { Check, Copy, Trash2, Wand2, X } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { errorCodeLabel, toApiError } from '@/lib/error-code'
import { buildTemplatePayload } from '@/lib/template-payload'
import { cn } from '@/lib/utils'
import type { ApiResponse } from '@/types/api'
import type { ProcessTemplate, TemplateDataType, TemplateKey } from '@/types/template'

type TemplateModalProps = {
  template: ProcessTemplate
  open: boolean
  onOpenChange: (open: boolean) => void
  onUse: (template: ProcessTemplate) => void
  onSave: (keys: TemplateKey[]) => Promise<ApiResponse<ProcessTemplate>>
  onDelete: (template: ProcessTemplate) => Promise<ApiResponse<ProcessTemplate>>
}

const DATA_TYPES: TemplateDataType[] = ['string', 'boolean', 'number', 'array', 'object']

const KEY_GRID =
  'grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_7rem_4.5rem_1.5rem] items-center gap-2'

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

export function TemplateModal({
  template,
  open,
  onOpenChange,
  onUse,
  onSave,
  onDelete,
}: TemplateModalProps) {
  const [keys, setKeys] = useState<TemplateKey[]>(template.keys)
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

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

  const save = async () => {
    if (saving || deleting) return
    setSaving(true)
    try {
      const result = await onSave(keys)
      if (result.success) {
        toast.add({ type: 'success', title: 'Template saved', description: result.message })
        return
      }
      const error = toApiError(result)
      toast.add({
        type: 'error',
        title: errorCodeLabel(error.code),
        description: error.message,
      })
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (deleting || saving) return
    setDeleting(true)
    try {
      const result = await onDelete(template)
      if (result.success) {
        toast.add({
          type: 'success',
          title: 'Template deleted',
          description: `${template.template_name} was removed.`,
        })
        setConfirmOpen(false)
        onOpenChange(false)
        return
      }
      const error = toApiError(result)
      toast.add({
        type: 'error',
        title: errorCodeLabel(error.code),
        description: error.message,
      })
    } finally {
      setDeleting(false)
    }
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
                Fields
              </p>
              <Button type='button' variant='outline' size='sm' onClick={addKey}>
                + Add field
              </Button>
            </div>

            {/* Header lives outside the ScrollArea so only the rows scroll. */}
            <div className={cn(KEY_GRID, 'pr-3 text-xs font-medium text-muted-foreground')}>
              <span>Key</span>
              <span>Value</span>
              <span>Data Type</span>
              <span className='text-center'>Required</span>
              <span />
            </div>

            <ScrollArea className='max-h-105 [&_[data-slot=scroll-area-viewport]]:max-h-105'>
              <div className='space-y-2 pr-3'>
                {keys.map((key, index) => (
                  <div key={index} className={KEY_GRID}>
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
                      <SelectTrigger className='w-full'>
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
                    <div className='flex justify-center'>
                      <Checkbox
                        checked={key.is_required}
                        onCheckedChange={(checked) =>
                          updateKey(index, { is_required: checked === true })
                        }
                      />
                    </div>
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
            <ScrollArea className='max-h-105 rounded-md border bg-muted [&_[data-slot=scroll-area-viewport]]:max-h-105'>
              <pre className='whitespace-pre-wrap break-words p-3 font-mono text-[11px] leading-relaxed'>
                {payloadJson}
              </pre>
            </ScrollArea>
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
            <Button
              type='button'
              variant='destructive'
              disabled={deleting}
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 strokeWidth={2} />
              Delete
            </Button>
            <Button type='button' disabled={saving} onClick={() => void save()}>
              {saving && <Spinner className='size-3.5' />}
              Save
            </Button>
          </div>
        </DialogFooter>

        <AlertDialog
          open={confirmOpen}
          onOpenChange={(nextOpen) => {
            if (!nextOpen && !deleting) setConfirmOpen(false)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogMedia className='text-destructive'>
                <Trash2 strokeWidth={2} />
              </AlertDialogMedia>
              <AlertDialogTitle>Delete Template?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete “{template.template_name}”? This permanently
                removes the template and its fields, and cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant='destructive'
                disabled={deleting}
                onClick={() => void confirmDelete()}
              >
                {deleting && <Spinner className='size-3.5' />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  )
}
