import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  ServerOff,
  Terminal,
  TriangleAlert,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Field, FieldGroup, FieldTitle } from '@/components/ui/field'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Spinner } from '@/components/ui/spinner'
import { Toggle } from '@/components/ui/toggle'
import { toast } from '@/components/ui/toast'
import { ErrorAlert } from '@/components/custom/error-alert'
import { PageHeader } from '@/components/custom/page-header'
import { ProcessForm } from '@/components/custom/process-form'
import { errorCodeLabel, toApiError } from '@/lib/error-code'
import { ALLOWED_FIELD_KEYS, REQUIRED_FIELD_KEYS, validateFields } from '@/lib/process-fields'
import { buildTemplatePayload } from '@/lib/template-payload'
import { cn, copyText } from '@/lib/utils'
import { useServerStore } from '@/stores/server.store'
import { useProcessStore } from '@/stores/process.store'
import { useTemplateStore } from '@/stores/template.store'
import type { ApiError } from '@/types/api'
import type { StartIssue, StartProcessPayload } from '@/types/process'
import type { TemplateKey } from '@/types/template'

// Coerces values by data_type (via the shared template-payload helper) and adds
// the API-level targetOs. The one special case is `instances: "max"`, which the
// numeric coercion would otherwise drop.
function buildProcessPayload(fields: TemplateKey[]): StartProcessPayload {
  const payload = buildTemplatePayload(fields)
  const instances = fields.find((field) => field.property_key.trim() === 'instances')
  if (instances?.property_value?.trim() === 'max') payload.instances = 'max'
  return { ...payload, targetOs: 'win32' } as StartProcessPayload
}

function mapIssues(issues: StartIssue[]): Record<string, string> {
  const mapped: Record<string, string> = {}
  for (const issue of issues) mapped[issue.field] = issue.message
  return mapped
}

// ---------------------------------------------------------------------------
// Presentational building blocks (kept in this file on purpose)
// ---------------------------------------------------------------------------

function StepMarker({
  active,
  done,
  children,
}: {
  active: boolean
  done: boolean
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'flex size-6 items-center justify-center rounded-full border text-xs font-medium',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'text-muted-foreground',
        done && 'border-primary text-primary',
      )}
    >
      {children}
    </span>
  )
}

function Stepper({ step }: { step: 1 | 2 }) {
  return (
    <div className='mx-auto mb-6 flex w-[70%] items-center gap-2'>
      <StepMarker active={step === 1} done={step > 1}>
        1
      </StepMarker>
      <span className={cn('text-xs', step === 1 ? 'font-medium' : 'text-muted-foreground')}>
        Server + template
      </span>
      <div className='h-px flex-1 bg-border' />
      <StepMarker active={step === 2} done={false}>
        2
      </StepMarker>
      <span className={cn('text-xs', step === 2 ? 'font-medium' : 'text-muted-foreground')}>
        Configure
      </span>
    </div>
  )
}

function TemplateOption({
  pressed,
  title,
  description,
  onSelect,
}: {
  pressed: boolean
  title: string
  description: string
  onSelect: () => void
}) {
  return (
    <Toggle
      variant='outline'
      pressed={pressed}
      onPressedChange={onSelect}
      className={cn(
        'h-auto flex-col items-start gap-1.5 p-3 text-left whitespace-normal',
        pressed && 'aria-pressed:border-primary',
      )}
    >
      <span className='flex w-full items-center gap-2'>
        <Check
          className={cn('size-4 shrink-0 transition-opacity', pressed ? 'opacity-100' : 'opacity-0')}
          strokeWidth={2}
        />
        <span className='text-sm font-medium'>{title}</span>
      </span>
      <span className='line-clamp-2 pl-6 text-xs text-muted-foreground'>{description}</span>
    </Toggle>
  )
}

function PayloadPreview({ payload }: { payload: StartProcessPayload }) {
  const [copied, setCopied] = useState(false)
  const json = useMemo(() => JSON.stringify(payload, null, 2), [payload])

  const copy = async () => {
    if (!(await copyText(json))) {
      toast.add({
        type: 'error',
        title: 'Copy failed',
        description: 'Clipboard is unavailable in this browser context.',
      })
      return
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <>
      <ScrollArea className='max-h-105 rounded-md border bg-muted **:data-[slot=scroll-area-viewport]:max-h-105'>
        <pre className='whitespace-pre-wrap wrap-break-words p-3 font-mono text-[11px] leading-relaxed'>
          {json}
        </pre>
      </ScrollArea>
      <Button type='button' variant='outline' className='w-full' onClick={() => void copy()}>
        {copied ? (
          <Check className='size-3.5' strokeWidth={2} />
        ) : (
          <Copy className='size-3.5' strokeWidth={2} />
        )}
        {copied ? 'Copied' : 'Copy JSON'}
      </Button>
    </>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function Process() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const step = useProcessStore((state) => state.step)
  const server = useProcessStore((state) => state.server)
  const template = useProcessStore((state) => state.template)
  const fields = useProcessStore((state) => state.fields)
  const status = useProcessStore((state) => state.status)
  const requestError = useProcessStore((state) => state.requestError)
  const issues = useProcessStore((state) => state.issues)
  const goToStep = useProcessStore((state) => state.goToStep)
  const selectServer = useProcessStore((state) => state.selectServer)
  const selectTemplate = useProcessStore((state) => state.selectTemplate)
  const setValue = useProcessStore((state) => state.setValue)
  const submit = useProcessStore((state) => state.submit)
  const reset = useProcessStore((state) => state.reset)

  const servers = useServerStore((state) => state.servers)
  const serversStatus = useServerStore((state) => state.status)
  const serversError = useServerStore((state) => state.requestError)
  const loadServers = useServerStore((state) => state.load)
  const templates = useTemplateStore((state) => state.templates)
  const templatesStatus = useTemplateStore((state) => state.status)
  const templatesError = useTemplateStore((state) => state.requestError)
  const loadTemplates = useTemplateStore((state) => state.load)

  const [clientErrors, setClientErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    void loadServers()
  }, [loadServers])

  useEffect(() => {
    void loadTemplates()
  }, [loadTemplates])

  const activeServers = useMemo(() => servers.filter((entry) => entry.is_active), [servers])
  const activeTemplates = useMemo(
    () => templates.filter((entry) => entry.is_active),
    [templates],
  )

  // With only one active server there is nothing to choose, so select it
  // automatically (e.g. after load, or when the list shrinks to one).
  useEffect(() => {
    if (activeServers.length !== 1) return
    const only = activeServers[0]
    if (server?.id === only.id) return
    selectServer(only)
  }, [activeServers, server, selectServer])

  // Preselects the template a "Use template" click linked to (?template=id).
  const templateParamApplied = useRef(false)
  useEffect(() => {
    if (templateParamApplied.current) return

    const raw = searchParams.get('template')
    if (raw === null || raw.trim() === '') return

    const id = Number(raw)
    if (!Number.isInteger(id)) return

    const match = activeTemplates.find((entry) => entry.id === id)
    if (!match) return

    templateParamApplied.current = true
    selectTemplate(match)
  }, [activeTemplates, searchParams, selectTemplate])

  const visibleFields = useMemo(
    () => fields.filter((field) => field.property_key.trim() !== '' && !field.is_hidden),
    [fields],
  )

  const payload = useMemo(() => buildProcessPayload(fields), [fields])

  const issueMap = useMemo(() => mapIssues(issues), [issues])
  const errors: Record<string, string> = { ...clientErrors, ...issueMap }

  // A server issue is only shown inline when the field is actually rendered;
  // the rest (e.g. hidden or unknown keys) are listed separately.
  const renderedKeys = useMemo(
    () => new Set(visibleFields.map((field) => field.property_key.trim())),
    [visibleFields],
  )

  const orphanIssues = useMemo(
    () => issues.filter((issue) => !renderedKeys.has(issue.field)),
    [issues, renderedKeys],
  )

  const unknownKeys = useMemo(
    () =>
      fields
        .map((field) => field.property_key.trim())
        .filter((key) => key !== '' && !ALLOWED_FIELD_KEYS.has(key)),
    [fields],
  )

  // Required keys the form does not render a row for (e.g. a template that
  // omits one); these cannot show inline, so they get an alert.
  const missingRequiredKeys = useMemo(
    () =>
      REQUIRED_FIELD_KEYS.filter(
        (key) => !fields.some((field) => field.property_key.trim() === key),
      ),
    [fields],
  )

  const handleSubmit = async () => {
    if (!server || status === 'loading') return

    const validationErrors = validateFields(fields)
    setClientErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) {
      toast.add({
        type: 'error',
        title: 'Check the highlighted fields',
        description: 'Some fields are missing or invalid.',
      })
      return
    }

    const name = payload.name
    const targetServer = server.server

    const request = submit(payload).then((result) => {
      if (!result.success) throw toApiError(result)
      return result
    })

    try {
      await toast.promise(request, {
        loading: { title: 'Registering process…' },
        success: {
          title: 'Process registered',
          description: `${name} is starting on ${targetServer}.`,
          actionProps: {
            children: 'View dashboard',
            onClick: () => navigate('/'),
          },
        },
        error: (error: ApiError) => ({
          title: errorCodeLabel(error.code),
          description: error.message,
        }),
      })

      reset()
      setClientErrors({})
    } catch {
      // toast.promise already surfaced the error; inline issues remain visible.
    }
  }

  return (
    <div className='mx-auto w-full max-w-[75%]'>
      <PageHeader
        title='Register process'
        description='Register a new process to monitor.'
      />

      <Stepper step={step} />

      {serversStatus === 'loading' && (
        <div className='flex items-center gap-2 py-6 text-sm text-muted-foreground'>
          <Spinner className='size-4' />
          Loading servers…
        </div>
      )}

      {serversStatus === 'error' && serversError && (
        <ErrorAlert error={serversError} className='my-6' />
      )}

      {serversStatus === 'success' && activeServers.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <ServerOff strokeWidth={2} />
            </EmptyMedia>
            <EmptyTitle>No active servers</EmptyTitle>
            <EmptyDescription>
              Register an active server before adding processes to it.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button render={<Link to='/server' />}>Register a server</Button>
          </EmptyContent>
        </Empty>
      )}

      {serversStatus === 'success' && activeServers.length > 0 && step === 1 && (
        <div className='grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]'>
          <Card>
            <CardHeader>
              <CardTitle>Server</CardTitle>
              <CardDescription>Select the server that will run the process.</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                items={activeServers.map((entry) => ({
                  value: String(entry.id),
                  label: entry.host,
                }))}
                value={server ? String(server.id) : ''}
                onValueChange={(value) =>
                  selectServer(activeServers.find((entry) => String(entry.id) === value) ?? null)
                }
              >
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='Select a server' />
                </SelectTrigger>
                <SelectContent>
                  {activeServers.map((entry) => (
                    <SelectItem key={entry.id} value={String(entry.id)}>
                      {entry.host}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <FieldGroup className='mt-3 gap-0 border-t pt-1'>
                <Field orientation='horizontal' className='items-center justify-between py-2'>
                  <FieldTitle>Server</FieldTitle>
                  <span className='truncate font-mono text-xs/relaxed font-medium'>
                    {server?.server ?? '—'}
                  </span>
                </Field>
                <Separator />
                <Field orientation='horizontal' className='items-center justify-between py-2'>
                  <FieldTitle>Protocol</FieldTitle>
                  <span className='font-mono text-xs/relaxed font-medium'>
                    {server?.protocol ?? '—'}
                  </span>
                </Field>
                <Separator />
                <Field orientation='horizontal' className='items-center justify-between py-2'>
                  <FieldTitle>Port</FieldTitle>
                  <span className='font-mono text-xs/relaxed font-medium'>
                    {server?.port ?? '—'}
                  </span>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Template</CardTitle>
              <CardDescription>
                Pick a template to prefill the configuration, or None to build it yourself.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {templatesStatus === 'loading' && (
                <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                  <Spinner className='size-4' />
                  Loading templates…
                </div>
              )}

              {templatesStatus === 'error' && templatesError && (
                <ErrorAlert error={templatesError} />
              )}

              {templatesStatus === 'success' && (
                <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3'>
                  <TemplateOption
                    pressed={template === 'none'}
                    title='None'
                    description='Start from an empty configuration.'
                    onSelect={() => selectTemplate('none')}
                  />
                  {activeTemplates.map((entry) => (
                    <TemplateOption
                      key={entry.id}
                      pressed={template !== 'none' && template.id === entry.id}
                      title={entry.template_name}
                      description={entry.description ?? entry.category ?? 'No description'}
                      onSelect={() => selectTemplate(entry)}
                    />
                  ))}
                </div>
              )}

              {template !== 'none' && template.preview && (
                <div className='mt-3 flex w-fit max-w-full items-center gap-2 rounded-md border bg-muted/40 px-2 py-1.5'>
                  <Terminal className='size-3 shrink-0 text-muted-foreground' strokeWidth={2} />
                  <code
                    className='min-w-0 truncate font-mono text-[0.6875rem] text-foreground/80'
                    title={template.preview}
                  >
                    {template.preview}
                  </code>
                </div>
              )}
            </CardContent>
          </Card>

          <div className='flex justify-end lg:col-span-2'>
            <Button type='button' disabled={!server} onClick={() => goToStep(2)}>
              Next: configure
              <ArrowRight strokeWidth={2} />
            </Button>
          </div>
        </div>
      )}

      {serversStatus === 'success' && activeServers.length > 0 && step === 2 && server && (
        <div className='grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]'>
          <div className='space-y-4'>
            <ProcessForm fields={visibleFields} errors={errors} onChange={setValue} />

            <div className='flex items-center justify-between'>
              <Button type='button' variant='outline' onClick={() => goToStep(1)}>
                <ArrowLeft strokeWidth={2} />
                Back
              </Button>
              <Button
                type='button'
                disabled={status === 'loading'}
                onClick={() => void handleSubmit()}
              >
                {status === 'loading' && <Spinner className='size-4' />}
                Register service
              </Button>
            </div>
          </div>

          <Card className='h-fit lg:sticky lg:top-4'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
                Payload preview
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              <div>
                <p className='text-[11px] text-muted-foreground'>Server</p>
                <p className='text-sm font-medium'>{server.server}</p>
              </div>

              <PayloadPreview payload={payload} />

              {unknownKeys.length > 0 && (
                <Alert>
                  <TriangleAlert strokeWidth={2} />
                  <AlertTitle>Unsupported fields</AlertTitle>
                  <AlertDescription>
                    The agent will ignore: {unknownKeys.join(', ')}
                  </AlertDescription>
                </Alert>
              )}

              {missingRequiredKeys.length > 0 && (
                <Alert variant='destructive'>
                  <TriangleAlert strokeWidth={2} />
                  <AlertTitle>Missing required fields</AlertTitle>
                  <AlertDescription>
                    Add these fields: {missingRequiredKeys.join(', ')}
                  </AlertDescription>
                </Alert>
              )}

              {orphanIssues.length > 0 && (
                <Alert variant='destructive'>
                  <TriangleAlert strokeWidth={2} />
                  <AlertTitle>Additional issues</AlertTitle>
                  <AlertDescription>
                    <ul className='ml-4 list-disc'>
                      {orphanIssues.map((issue) => (
                        <li key={`${issue.field}:${issue.message}`}>
                          {issue.field}: {issue.message}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {requestError && issues.length === 0 && <ErrorAlert error={requestError} />}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
