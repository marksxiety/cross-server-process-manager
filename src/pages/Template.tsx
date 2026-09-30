import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { Check, Copy, FileText, Plus, RefreshCw, Trash2, Wand2, X } from 'lucide-react'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/components/ui/toast'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { PageHeader } from '@/components/custom/page-header'
import { ErrorAlert } from '@/components/custom/error-alert'
import { TemplateCard } from '@/components/custom/template-card'
import { Modal } from '@/components/custom/modal'
import { useTemplateStore } from '@/stores/template.store'
import { errorCodeLabel, toApiError } from '@/lib/error-code'
import { toSavableKeys } from '@/lib/template-keys'
import { buildTemplatePayload } from '@/lib/template-payload'
import { cn } from '@/lib/utils'
import type { ApiResponse } from '@/types/api'
import type { ProcessTemplate, TemplateDataType, TemplateKey } from '@/types/template'

type StatusFilter = 'all' | 'active' | 'inactive'

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

export function Template() {
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [selected, setSelected] = useState<ProcessTemplate | null>(null)
  const [keys, setKeys] = useState<TemplateKey[]>([])
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const templates = useTemplateStore((state) => state.templates)
  const status = useTemplateStore((state) => state.status)
  const requestError = useTemplateStore((state) => state.requestError)
  const load = useTemplateStore((state) => state.load)
  const save = useTemplateStore((state) => state.save)
  const remove = useTemplateStore((state) => state.remove)
  const navigate = useNavigate()

  useEffect(() => {
    void load()
  }, [load])

  const counts = useMemo(
    () => ({
      all: templates.length,
      active: templates.filter((t) => t.is_active).length,
      inactive: templates.filter((t) => !t.is_active).length,
    }),
    [templates],
  )

  const filteredTemplates = useMemo(() => {
    if (filter === 'all') return templates
    return templates.filter((t) => (filter === 'active' ? t.is_active : !t.is_active))
  }, [templates, filter])

  const grouped = useMemo(() => {
    const groups = new Map<string, ProcessTemplate[]>()
    for (const template of filteredTemplates) {
      const category = template.category ?? 'Uncategorized'
      const bucket = groups.get(category)
      if (bucket) bucket.push(template)
      else groups.set(category, [template])
    }
    return [...groups.entries()]
  }, [filteredTemplates])

  const payload = useMemo(() => buildTemplatePayload(keys), [keys])
  const payloadJson = useMemo(() => JSON.stringify(payload, null, 2), [payload])

  const handleUse = (template: ProcessTemplate) => {
    void navigate(`/process?template=${template.id}`)
  }

  // Seeds the editor rows when a template is opened.
  const openTemplate = (template: ProcessTemplate) => {
    setKeys(template.keys)
    setSelected(template)
  }

  const handleSave = async (nextKeys: TemplateKey[]): Promise<ApiResponse<ProcessTemplate>> => {
    if (!selected) {
      return { success: false, message: 'No template selected', info: null, status: 0 }
    }
    return save(selected.id, toSavableKeys(nextKeys))
  }

  const handleDelete = (template: ProcessTemplate): Promise<ApiResponse<ProcessTemplate>> =>
    remove(template.id)

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

  const saveKeys = async () => {
    if (saving || deleting) return
    setSaving(true)
    try {
      const result = await handleSave(keys)
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
    if (deleting || saving || !selected) return
    setDeleting(true)
    try {
      const result = await handleDelete(selected)
      if (result.success) {
        toast.add({
          type: 'success',
          title: 'Template deleted',
          description: `${selected.template_name} was removed.`,
        })
        setConfirmOpen(false)
        setSelected(null)
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
    <div className='mx-auto w-full max-w-[75%]'>
      <PageHeader title='Templates' description='Manage process templates.'>
        <Tabs value={filter} onValueChange={(value) => setFilter(value as StatusFilter)}>
          <TabsList>
            <TabsTrigger value='all'>
              All <span className='ml-1.5 text-muted-foreground'>{counts.all}</span>
            </TabsTrigger>
            <TabsTrigger value='active'>
              Active <span className='ml-1.5 text-muted-foreground'>{counts.active}</span>
            </TabsTrigger>
            <TabsTrigger value='inactive'>
              Inactive <span className='ml-1.5 text-muted-foreground'>{counts.inactive}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className='flex items-center gap-2'>
          <Button
            variant='ghost'
            size='icon-sm'
            aria-label='Refresh templates'
            title='Refresh templates'
          >
            <RefreshCw strokeWidth={2} />
          </Button>
          <Button size='sm'>
            <Plus strokeWidth={2} />
            New Template
          </Button>
        </div>
      </PageHeader>

      {status === 'loading' && (
        <div className='flex items-center gap-2 py-6 text-sm text-muted-foreground'>
          <Spinner className='size-4' />
          Loading templates…
        </div>
      )}

      {status === 'error' && requestError && (
        <ErrorAlert error={requestError} className='my-6' />
      )}

      {status === 'success' && templates.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <FileText strokeWidth={2} />
            </EmptyMedia>
            <EmptyTitle>No templates</EmptyTitle>
            <EmptyDescription>
              Templates seeded into the registry will appear here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {status === 'success' &&
        templates.length > 0 &&
        (filteredTemplates.length > 0 ? (
          <div className='space-y-6'>
            {grouped.map(([category, items]) => (
              <section key={category}>
                <h2 className='mb-3 text-xs font-medium text-muted-foreground'>{category}</h2>
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                  {items.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onOpen={openTemplate}
                      onUse={handleUse}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <p className='py-6 text-sm text-muted-foreground'>No {filter} templates.</p>
        ))}

      {selected && (
        <Modal
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null)
          }}
          className='sm:max-w-5xl'
          title={selected.template_name}
          description={
            selected.category ? (
              <Badge variant='outline' className='w-fit font-normal text-muted-foreground'>
                {selected.category}
              </Badge>
            ) : undefined
          }
          footerClassName='sm:justify-between'
          footer={
            <>
              <Button
                type='button'
                onClick={() => {
                  handleUse(selected)
                  setSelected(null)
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
                <Button type='button' disabled={saving} onClick={() => void saveKeys()}>
                  {saving && <Spinner className='size-3.5' />}
                  Save
                </Button>
              </div>
            </>
          }
        >
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
                        onChange={(event) =>
                          updateKey(index, { property_key: event.target.value })
                        }
                      />
                      <Input
                        className='font-mono text-xs'
                        placeholder='value'
                        value={key.property_value ?? ''}
                        onChange={(event) =>
                          updateKey(index, { property_value: event.target.value })
                        }
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
                  Are you sure you want to delete “{selected.template_name}”? This permanently
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
        </Modal>
      )}
    </div>
  )
}
