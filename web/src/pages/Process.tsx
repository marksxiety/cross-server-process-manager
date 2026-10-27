import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Copy,
  ServerOff,
  Terminal,
  TriangleAlert,
  X,
} from 'lucide-react'
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
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
import { ProcessForm } from '@/components/custom/process-form'
import { useDismissedFlag } from '@/hooks/use-dismissed-flag'
import { useAccess } from '@/hooks/use-access'
import { errorCodeLabel, toApiError } from '@/lib/error-code'
import { isCatalogField, validateRegisterValues } from '@/lib/process-fields'
import { buildTemplatePayload } from '@/lib/template-payload'
import { cn, copyText } from '@/lib/utils'
import { useServerStore } from '@/stores/server.store'
import { useProcessStore } from '@/stores/process.store'
import { useTemplateStore } from '@/stores/template.store'
import type { ApiError } from '@/types/api'
import type { StartIssue, StartProcessPayload } from '@/types/process'
import type { TemplateValues } from '@/types/template'

// Builds the sparse payload from the form values and adds the API-level targetOs.
function buildProcessPayload(values: TemplateValues): StartProcessPayload {
  return { ...buildTemplatePayload(values), targetOs: 'win32' } as StartProcessPayload
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

function Stepper({
  step,
  canGoToStep2,
  onStepChange,
}: {
  step: 1 | 2
  canGoToStep2: boolean
  onStepChange: (step: 1 | 2) => void
}) {
  return (
    <div className='flex w-full max-w-md flex-1 items-center gap-2 sm:w-auto sm:min-w-64'>
      <button
        type='button'
        onClick={() => onStepChange(1)}
        aria-current={step === 1 ? 'step' : undefined}
        className='flex cursor-pointer items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/30'
      >
        <StepMarker active={step === 1} done={step > 1}>
          1
        </StepMarker>
        <span className={cn('text-xs', step === 1 ? 'font-medium' : 'text-muted-foreground')}>
          Server + template
        </span>
      </button>
      <div className='h-px flex-1 bg-border' />
      <button
        type='button'
        onClick={() => onStepChange(2)}
        disabled={!canGoToStep2}
        aria-current={step === 2 ? 'step' : undefined}
        className='flex cursor-pointer items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed'
      >
        <StepMarker active={step === 2} done={false}>
          2
        </StepMarker>
        <span className={cn('text-xs', step === 2 ? 'font-medium' : 'text-muted-foreground')}>
          Configure
        </span>
      </button>
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
      <ScrollArea className='max-h-64 rounded-md border bg-muted sm:max-h-80 lg:max-h-105 **:data-[slot=scroll-area-viewport]:max-h-64 sm:**:data-[slot=scroll-area-viewport]:max-h-80 lg:**:data-[slot=scroll-area-viewport]:max-h-105'>
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

function PayloadPreviewCard({
  serverName,
  payload,
  orphanIssues,
  requestError,
}: {
  serverName: string
  payload: StartProcessPayload
  orphanIssues: StartIssue[]
  requestError: ApiError | null
}) {
  return (
    <CardContent className='space-y-3'>
      <div>
        <p className='text-[11px] text-muted-foreground'>Server</p>
        <p className='truncate text-sm font-medium' title={serverName}>
          {serverName}
        </p>
      </div>

      <PayloadPreview payload={payload} />

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

      {requestError && <ErrorAlert error={requestError} />}
    </CardContent>
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
  const values = useProcessStore((state) => state.values)
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
  const { isDismissed, dismiss } = useDismissedFlag('process-tested-reminder')
  const access = useAccess()
  const canStart = access.canDo('process.start')
  const canRegisterServer =
    access.canVisit('servers') && access.canDo('server.create')

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

  const payload = useMemo(() => buildProcessPayload(values), [values])

  // Step 2 is only reachable with a server selected: free 1 ↔ 2 navigation
  // then, otherwise only 2 → 1 (back) is allowed.
  const canGoToStep2 = server !== null

  const issueMap = useMemo(() => mapIssues(issues), [issues])
  const errors: Record<string, string> = { ...clientErrors, ...issueMap }

  // Every catalog field is always rendered, so only non-field issues (e.g. an
  // unknown key from a hand-written template) need to be listed separately.
  const orphanIssues = useMemo(
    () => issues.filter((issue) => !isCatalogField(issue.field)),
    [issues],
  )

  const handleSubmit = async () => {
    if (!server || status === 'loading' || !canStart) return

    const validationErrors = validateRegisterValues(values)
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
    <div className='min-w-0'>
      <div className='mb-6 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-6'>
        <div>
          <h1 className='text-xl font-semibold tracking-tight sm:text-2xl'>Register process</h1>
          <p className='text-sm text-muted-foreground'>Register a new process to monitor.</p>
        </div>

        <Stepper step={step} canGoToStep2={canGoToStep2} onStepChange={goToStep} />
      </div>

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
            {canRegisterServer ? (
              <Button render={<Link to='/server' />}>Register a server</Button>
            ) : (
              <p className='text-xs text-muted-foreground'>
                You don&apos;t have permission to register a server.
              </p>
            )}
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
            <Button
              type='button'
              className='w-full sm:w-auto'
              disabled={!canGoToStep2}
              onClick={() => goToStep(2)}
            >
              Next: configure
              <ArrowRight strokeWidth={2} />
            </Button>
          </div>
        </div>
      )}

      {serversStatus === 'success' && activeServers.length > 0 && step === 2 && server && (
        <div className='grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]'>
          <div className='min-w-0 space-y-4'>
            {!isDismissed && (
              <div className='mb-2'>
                <Alert variant='destructive'>
                  <TriangleAlert strokeWidth={2} />
                  <AlertTitle>Test on the server first</AlertTitle>
                  <AlertDescription>
                    Verify the process runs in the server environment before registering. Confirm no
                    conflicts with existing processes and that the required ports are free.
                  </AlertDescription>
                  <AlertAction>
                    <Button
                      variant='ghost'
                      size='icon-sm'
                      aria-label='Dismiss'
                      onClick={dismiss}
                    >
                      <X strokeWidth={2} />
                    </Button>
                  </AlertAction>
                </Alert>
              </div>
            )}

            <ProcessForm values={values} errors={errors} onChange={setValue} />

            <Collapsible defaultOpen={false} className='lg:hidden'>
              <CollapsibleTrigger
                render={
                  <Button
                    type='button'
                    variant='outline'
                    className='w-full justify-between'
                  />
                }
              >
                Payload preview
                <ChevronDown strokeWidth={2} className='size-4' />
              </CollapsibleTrigger>
              <CollapsibleContent className='mt-2'>
                <Card>
                  <PayloadPreviewCard
                    serverName={server.server}
                    payload={payload}
                    orphanIssues={orphanIssues}
                    requestError={issues.length === 0 ? requestError : null}
                  />
                </Card>
              </CollapsibleContent>
            </Collapsible>

            <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
              <Button
                type='button'
                variant='outline'
                className='w-full sm:w-auto'
                onClick={() => goToStep(1)}
              >
                <ArrowLeft strokeWidth={2} />
                Back
              </Button>
              <Button
                type='button'
                className='w-full sm:w-auto'
                disabled={status === 'loading' || !canStart}
                onClick={() => void handleSubmit()}
              >
                {status === 'loading' && <Spinner className='size-4' />}
                Register service
              </Button>
            </div>
            {!canStart && (
              <p className='text-xs text-muted-foreground'>
                You don&apos;t have permission to start processes.
              </p>
            )}
          </div>

          <Card className='hidden h-fit lg:sticky lg:top-4 lg:block'>
            <CardHeader className='pb-2'>
              <CardTitle className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
                Payload preview
              </CardTitle>
            </CardHeader>
            <PayloadPreviewCard
              serverName={server.server}
              payload={payload}
              orphanIssues={orphanIssues}
              requestError={issues.length === 0 ? requestError : null}
            />
          </Card>
        </div>
      )}
    </div>
  )
}
