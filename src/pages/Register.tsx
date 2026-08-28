import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Toggle } from '@/components/ui/toggle'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ArrowLeft, ArrowRight, Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StepBadge } from '@/components/custom/StepBadge'
import { EMPTY_ADVANCED, EMPTY_BASE, buildPayload } from '@/utils/register'
import type { AdvancedConfig, BaseConfig, Server, Template } from '@/types'
import serversData from '@/data/servers.json'
import templatesData from '@/data/templates.json'

const SERVERS: Server[] = serversData
const TEMPLATES = templatesData as Template[]
const DEFAULT_TEMPLATE = TEMPLATES.find((t) => t.name === 'Blank / default') ?? TEMPLATES[0]

// ---------- Component ----------

export function Register() {
  const [step, setStep] = useState<1 | 2>(1)
  const [serverUrl, setServerUrl] = useState<string>(SERVERS[0]?.url ?? '')
  const [templateId, setTemplateId] = useState<string>(DEFAULT_TEMPLATE.id)
  const [base, setBase] = useState<BaseConfig>({
    ...EMPTY_BASE,
    ...DEFAULT_TEMPLATE.defaults,
  })
  const [advanced, setAdvanced] = useState<AdvancedConfig>(EMPTY_ADVANCED)
  const [copied, setCopied] = useState(false)

  const server = SERVERS.find((s) => s.url === serverUrl)
  const payload = useMemo(() => buildPayload(base, advanced), [base, advanced])
  const payloadJson = useMemo(() => JSON.stringify(payload, null, 2), [payload])

  function selectTemplate(id: string) {
    setTemplateId(id)
    const tpl = TEMPLATES.find((t) => t.id === id)
    setBase({ ...EMPTY_BASE, ...tpl?.defaults })
  }

  function updateBase<K extends keyof BaseConfig>(
    key: K,
    value: BaseConfig[K],
  ) {
    setBase((prev) => ({ ...prev, [key]: value }))
  }

  function updateAdvanced<K extends keyof AdvancedConfig>(
    key: K,
    value: AdvancedConfig[K],
  ) {
    setAdvanced((prev) => ({ ...prev, [key]: value }))
  }

  async function copyPayload() {
    await navigator.clipboard.writeText(payloadJson)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <ScrollArea className='h-full'>
      <div className='mx-auto max-w-5xl p-6'>
        <h2 className='mb-1 text-lg font-medium'>Register service</h2>
        <p className='mb-6 text-sm text-muted-foreground'>
          {step === 1
            ? 'Step 1 of 2 · Server and template'
            : 'Step 2 of 2 · Configure'}
        </p>

        <Stepper step={step} />

        {step === 1 ? (
          <StepServerTemplate
            serverUrl={serverUrl}
            setServerUrl={setServerUrl}
            templateId={templateId}
            selectTemplate={selectTemplate}
            onNext={() => setStep(2)}
          />
        ) : (
          <div className='grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]'>
            <div>
              <div className='flex flex-col gap-4'>
                <BaseFieldsCard base={base} updateBase={updateBase} />

                <Card>
                  <CardHeader>
                    <CardTitle>Advanced</CardTitle>
                    <CardDescription>
                      Optional PM2 settings, collapsed by default.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AdvancedAccordion
                      advanced={advanced}
                      updateAdvanced={updateAdvanced}
                    />
                  </CardContent>
                </Card>
              </div>

              <div className='mt-6 flex items-center justify-between border-t pt-4'>
                <Button variant='outline' onClick={() => setStep(1)}>
                  <ArrowLeft className='mr-1 h-4 w-4' />
                  Back
                </Button>
                <Button onClick={() => console.log('submit', payload)}>
                  Register service
                </Button>
              </div>
            </div>

            <Card className='h-fit'>
              <CardHeader className='pb-2'>
                <CardTitle className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>
                  Payload preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='mb-3'>
                  <p className='text-[11px] text-muted-foreground'>Server</p>
                  <p className='text-sm font-medium'>{server?.server ?? '—'}</p>
                </div>
                <pre className='mb-3 max-h-105 overflow-auto rounded-md border bg-muted p-3 font-mono text-[11px] leading-relaxed'>
                  {payloadJson}
                </pre>
                <Button
                  variant='outline'
                  className='w-full'
                  onClick={copyPayload}
                >
                  {copied ? (
                    <Check className='mr-1 h-3.5 w-3.5' />
                  ) : (
                    <Copy className='mr-1 h-3.5 w-3.5' />
                  )}
                  {copied ? 'Copied' : 'Copy JSON'}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}

// ---------- Subcomponents ----------

function Stepper({ step }: { step: 1 | 2 }) {
  return (
    <div className='mb-6 flex items-center gap-2'>
      <StepBadge active={step >= 1} done={step > 1}>
        1
      </StepBadge>
      <span
        className={cn(
          'text-xs',
          step === 1 ? 'font-medium' : 'text-muted-foreground',
        )}
      >
        Server + template
      </span>
      <div className='h-px flex-1 bg-border' />
      <StepBadge active={step >= 2} done={false}>
        2
      </StepBadge>
      <span
        className={cn(
          'text-xs',
          step === 2 ? 'font-medium' : 'text-muted-foreground',
        )}
      >
        Configure
      </span>
    </div>
  )
}

function StepServerTemplate({
  serverUrl,
  setServerUrl,
  templateId,
  selectTemplate,
  onNext,
}: {
  serverUrl: string
  setServerUrl: (url: string) => void
  templateId: string
  selectTemplate: (id: string) => void
  onNext: () => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Server</CardTitle>
        <CardDescription>Select the target server</CardDescription>
      </CardHeader>
      <CardContent>
        <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
          {SERVERS.map((s) => (
            <Toggle
              key={s.url}
              variant='outline'
              pressed={serverUrl === s.url}
              onPressedChange={() => setServerUrl(s.url)}
              className={cn(
                'flex h-auto items-center justify-start gap-2 p-3 text-left',
                serverUrl === s.url && 'aria-pressed:border-primary',
              )}
            >
              <Check
                className={cn(
                  'h-4 w-4 shrink-0 transition-opacity',
                  serverUrl === s.url ? 'opacity-100' : 'opacity-0',
                )}
              />
              {s.server}
            </Toggle>
          ))}
        </div>
      </CardContent>

      <CardHeader>
        <CardTitle>Template</CardTitle>
        <CardDescription>
          Select a template to prefill the configuration
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
          {TEMPLATES.map((t) => (
            <Toggle
              key={t.id}
              variant='outline'
              pressed={templateId === t.id}
              onPressedChange={() => selectTemplate(t.id)}
              className={cn(
                'h-auto flex-col items-start gap-1.5 p-3 text-left',
                templateId === t.id && 'aria-pressed:border-primary',
              )}
            >
              <span className='flex w-full items-center gap-2'>
                <Check
                  className={cn(
                    'h-4 w-4 shrink-0 transition-opacity',
                    templateId === t.id ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <span className='text-sm font-medium'>{t.name}</span>
              </span>
              <span className='pl-6 text-xs text-muted-foreground'>
                {t.description}
              </span>
            </Toggle>
          ))}
        </div>
      </CardContent>

      <CardFooter className='justify-end border-t'>
        <Button onClick={onNext}>
          Next: configure
          <ArrowRight className='ml-1 h-4 w-4' />
        </Button>
      </CardFooter>
    </Card>
  )
}

function BaseFieldsCard({
  base,
  updateBase,
}: {
  base: BaseConfig
  updateBase: <K extends keyof BaseConfig>(key: K, value: BaseConfig[K]) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Base</CardTitle>
        <CardDescription>
          Base fields cover every service you run today. Everything below is
          optional.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
          <Field>
            <FieldLabel className='mb-1 block text-muted-foreground'>
              Name
            </FieldLabel>
            <Input
              placeholder='my-app'
              value={base.name}
              onChange={(e) => updateBase('name', e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel className='mb-1 block text-muted-foreground'>
              Namespace
            </FieldLabel>
            <Input
              placeholder='my-namespace'
              value={base.namespace}
              onChange={(e) => updateBase('namespace', e.target.value)}
            />
          </Field>
          <Field className='sm:col-span-2'>
            <FieldLabel className='mb-1 block text-muted-foreground'>
              Working directory (cwd)
            </FieldLabel>
            <Input
              className='font-mono text-xs'
              placeholder='C:\path\to\app'
              value={base.cwd}
              onChange={(e) => updateBase('cwd', e.target.value)}
            />
          </Field>
          <Field className='sm:col-span-2'>
            <FieldLabel className='mb-1 block text-muted-foreground'>
              Script
              <span className='ml-0.5 text-destructive'>*</span>
            </FieldLabel>
            <Input
              className='font-mono text-xs'
              placeholder='./dist/index.js'
              value={base.script}
              onChange={(e) => updateBase('script', e.target.value)}
            />
          </Field>
          <Field className='sm:col-span-2'>
            <FieldLabel className='mb-1 block text-muted-foreground'>
              Args (comma separated)
            </FieldLabel>
            <Input
              placeholder='--flag, value'
              value={base.args}
              onChange={(e) => updateBase('args', e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel className='mb-1 block text-muted-foreground'>
              Interpreter
            </FieldLabel>
            <Input
              className='font-mono text-xs'
              placeholder='C:\path\to\node.exe'
              value={base.interpreter}
              onChange={(e) => updateBase('interpreter', e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel className='mb-1 block text-muted-foreground'>
              Interpreter args (optional)
            </FieldLabel>
            <Input
              className='font-mono text-xs'
              placeholder='--flag=value'
              value={base.interpreter_args}
              onChange={(e) => updateBase('interpreter_args', e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel className='mb-1 block text-muted-foreground'>
              Exec mode
            </FieldLabel>
            <Select
              value={base.exec_mode}
              onValueChange={(v) =>
                updateBase('exec_mode', v as 'fork' | 'cluster')
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='fork'>fork</SelectItem>
                <SelectItem value='cluster'>cluster</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel className='mb-1 block text-muted-foreground'>
              Instances
            </FieldLabel>
            <Input
              type='number'
              value={base.instances}
              onChange={(e) => updateBase('instances', Number(e.target.value))}
            />
          </Field>
          <div className='flex items-center gap-6 sm:col-span-2'>
            <Field orientation='horizontal' className='w-fit flex-none'>
              <Checkbox
                id='autorestart'
                checked={base.autorestart}
                onCheckedChange={(v) => updateBase('autorestart', !!v)}
              />
              <FieldLabel htmlFor='autorestart' className='text-sm'>
                Autorestart
              </FieldLabel>
            </Field>
            <Field orientation='horizontal' className='w-fit flex-none'>
              <Checkbox
                id='windowsHide'
                checked={base.windowsHide}
                onCheckedChange={(v) => updateBase('windowsHide', !!v)}
              />
              <FieldLabel htmlFor='windowsHide' className='text-sm'>
                Windows hide
              </FieldLabel>
            </Field>
            <Field orientation='horizontal' className='w-fit flex-none'>
              <Checkbox
                id='watch'
                checked={base.watch}
                onCheckedChange={(v) => updateBase('watch', !!v)}
              />
              <FieldLabel htmlFor='watch' className='text-sm'>
                Watch
              </FieldLabel>
            </Field>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AdvancedAccordion({
  advanced,
  updateAdvanced,
}: {
  advanced: AdvancedConfig
  updateAdvanced: <K extends keyof AdvancedConfig>(
    key: K,
    value: AdvancedConfig[K],
  ) => void
}) {
  return (
    <Accordion defaultValue={[]} className='w-full'>
      <AccordionItem value='restart'>
        <AccordionTrigger className='text-sm font-medium'>
          Restart / crash handling
        </AccordionTrigger>
        <AccordionContent>
          <div className='grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2'>
            <Field>
              <FieldLabel className='mb-1 block text-muted-foreground'>
                Max restarts
              </FieldLabel>
              <Input
                type='number'
                value={advanced.max_restarts}
                onChange={(e) =>
                  updateAdvanced('max_restarts', Number(e.target.value))
                }
              />
            </Field>
            <Field>
              <FieldLabel className='mb-1 block text-muted-foreground'>
                Min uptime
              </FieldLabel>
              <Input
                placeholder='5s'
                value={advanced.min_uptime}
                onChange={(e) => updateAdvanced('min_uptime', e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel className='mb-1 block text-muted-foreground'>
                Restart delay (ms)
              </FieldLabel>
              <Input
                type='number'
                value={advanced.restart_delay}
                onChange={(e) =>
                  updateAdvanced('restart_delay', Number(e.target.value))
                }
              />
            </Field>
            <Field>
              <FieldLabel className='mb-1 block text-muted-foreground'>
                Exp backoff base (ms)
              </FieldLabel>
              <Input
                type='number'
                value={advanced.exp_backoff_restart_delay}
                onChange={(e) =>
                  updateAdvanced(
                    'exp_backoff_restart_delay',
                    Number(e.target.value),
                  )
                }
              />
            </Field>
            <Field>
              <FieldLabel className='mb-1 block text-muted-foreground'>
                Max memory restart
              </FieldLabel>
              <Input
                placeholder='256M'
                value={advanced.max_memory_restart}
                onChange={(e) =>
                  updateAdvanced('max_memory_restart', e.target.value)
                }
              />
            </Field>
            <Field>
              <FieldLabel className='mb-1 block text-muted-foreground'>
                Kill timeout (ms)
              </FieldLabel>
              <Input
                type='number'
                value={advanced.kill_timeout}
                onChange={(e) =>
                  updateAdvanced('kill_timeout', Number(e.target.value))
                }
              />
            </Field>
            <Field>
              <FieldLabel className='mb-1 block text-muted-foreground'>
                Listen timeout (ms)
              </FieldLabel>
              <Input
                type='number'
                value={advanced.listen_timeout}
                onChange={(e) =>
                  updateAdvanced('listen_timeout', Number(e.target.value))
                }
              />
            </Field>
            <Field>
              <FieldLabel className='mb-1 block text-muted-foreground'>
                Kill retry time (ms)
              </FieldLabel>
              <Input
                type='number'
                value={advanced.kill_retry_time}
                onChange={(e) =>
                  updateAdvanced('kill_retry_time', Number(e.target.value))
                }
              />
            </Field>
            <Field className='sm:col-span-2'>
              <FieldLabel className='mb-1 block text-muted-foreground'>
                Stop exit codes (comma separated)
              </FieldLabel>
              <Input
                placeholder='0, 130'
                value={advanced.stop_exit_codes}
                onChange={(e) =>
                  updateAdvanced('stop_exit_codes', e.target.value)
                }
              />
            </Field>
            <div className='flex items-center gap-6 sm:col-span-2'>
              <Field orientation='horizontal' className='w-fit flex-none'>
                <Checkbox
                  id='wait_ready'
                  checked={advanced.wait_ready}
                  onCheckedChange={(v) => updateAdvanced('wait_ready', !!v)}
                />
                <FieldLabel htmlFor='wait_ready' className='text-sm'>
                  Wait ready
                </FieldLabel>
              </Field>
              <Field orientation='horizontal' className='w-fit flex-none'>
                <Checkbox
                  id='shutdown_with_message'
                  checked={advanced.shutdown_with_message}
                  onCheckedChange={(v) =>
                    updateAdvanced('shutdown_with_message', !!v)
                  }
                />
                <FieldLabel htmlFor='shutdown_with_message' className='text-sm'>
                  Shutdown with message
                </FieldLabel>
              </Field>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value='watch'>
        <AccordionTrigger className='text-sm font-medium'>
          Watch and ignore rules
        </AccordionTrigger>
        <AccordionContent>
          <div className='grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2'>
            <Field className='sm:col-span-2'>
              <FieldLabel className='mb-1 block text-muted-foreground'>
                Ignore watch (comma separated)
              </FieldLabel>
              <Input
                placeholder='node_modules, temp, *.log'
                value={advanced.ignore_watch}
                onChange={(e) => updateAdvanced('ignore_watch', e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel className='mb-1 block text-muted-foreground'>
                Watch delay (ms)
              </FieldLabel>
              <Input
                type='number'
                value={advanced.watch_delay}
                onChange={(e) =>
                  updateAdvanced('watch_delay', Number(e.target.value))
                }
              />
            </Field>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value='env'>
        <AccordionTrigger className='text-sm font-medium'>
          Environment variables
        </AccordionTrigger>
        <AccordionContent>
          <div className='grid grid-cols-1 gap-4 pt-2'>
            <Field className='sm:col-span-2'>
              <FieldLabel className='mb-1 block text-muted-foreground'>
                env (KEY=value per line)
              </FieldLabel>
              <textarea
                className='min-h-20 w-full rounded-md border bg-background p-2 font-mono text-xs'
                placeholder={'NODE_ENV=production\nPORT=3000'}
                value={advanced.env}
                onChange={(e) => updateAdvanced('env', e.target.value)}
              />
            </Field>
            <Field className='sm:col-span-2'>
              <FieldLabel className='mb-1 block text-muted-foreground'>
                env_production (KEY=value per line)
              </FieldLabel>
              <textarea
                className='min-h-15 w-full rounded-md border bg-background p-2 font-mono text-xs'
                value={advanced.env_production}
                onChange={(e) =>
                  updateAdvanced('env_production', e.target.value)
                }
              />
            </Field>
            <Field className='sm:col-span-2'>
              <FieldLabel className='mb-1 block text-muted-foreground'>
                env_development (KEY=value per line)
              </FieldLabel>
              <textarea
                className='min-h-15 w-full rounded-md border bg-background p-2 font-mono text-xs'
                value={advanced.env_development}
                onChange={(e) =>
                  updateAdvanced('env_development', e.target.value)
                }
              />
            </Field>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value='logging'>
        <AccordionTrigger className='text-sm font-medium'>
          Logging
        </AccordionTrigger>
        <AccordionContent>
          <div className='grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2'>
            <Field className='sm:col-span-2'>
              <FieldLabel className='mb-1 block text-muted-foreground'>
                Output log path
              </FieldLabel>
              <Input
                className='font-mono text-xs'
                placeholder='./logs/example-out.log'
                value={advanced.output}
                onChange={(e) => updateAdvanced('output', e.target.value)}
              />
            </Field>
            <Field className='sm:col-span-2'>
              <FieldLabel className='mb-1 block text-muted-foreground'>
                Error log path
              </FieldLabel>
              <Input
                className='font-mono text-xs'
                placeholder='./logs/example-error.log'
                value={advanced.error}
                onChange={(e) => updateAdvanced('error', e.target.value)}
              />
            </Field>
            <Field className='sm:col-span-2'>
              <FieldLabel className='mb-1 block text-muted-foreground'>
                Combined log file
              </FieldLabel>
              <Input
                className='font-mono text-xs'
                value={advanced.log_file}
                onChange={(e) => updateAdvanced('log_file', e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel className='mb-1 block text-muted-foreground'>
                PID file
              </FieldLabel>
              <Input
                className='font-mono text-xs'
                value={advanced.pid_file}
                onChange={(e) => updateAdvanced('pid_file', e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel className='mb-1 block text-muted-foreground'>
                Log date format
              </FieldLabel>
              <Input
                placeholder='YYYY-MM-DD HH:mm:ss Z'
                value={advanced.log_date_format}
                onChange={(e) =>
                  updateAdvanced('log_date_format', e.target.value)
                }
              />
            </Field>
            <div className='flex flex-wrap items-center gap-6 sm:col-span-2'>
              <Field orientation='horizontal' className='w-fit flex-none'>
                <Checkbox
                  id='merge_logs'
                  checked={advanced.merge_logs}
                  onCheckedChange={(v) => updateAdvanced('merge_logs', !!v)}
                />
                <FieldLabel htmlFor='merge_logs' className='text-sm'>
                  Merge logs
                </FieldLabel>
              </Field>
              <Field orientation='horizontal' className='w-fit flex-none'>
                <Checkbox
                  id='time'
                  checked={advanced.time}
                  onCheckedChange={(v) => updateAdvanced('time', !!v)}
                />
                <FieldLabel htmlFor='time' className='text-sm'>
                  Time prefix
                </FieldLabel>
              </Field>
              <Field orientation='horizontal' className='w-fit flex-none'>
                <Checkbox
                  id='combine_logs'
                  checked={advanced.combine_logs}
                  onCheckedChange={(v) =>
                    updateAdvanced('combine_logs', !!v)
                  }
                />
                <FieldLabel htmlFor='combine_logs' className='text-sm'>
                  Combine logs
                </FieldLabel>
              </Field>
              <Field orientation='horizontal' className='w-fit flex-none'>
                <Checkbox
                  id='disable_logs'
                  checked={advanced.disable_logs}
                  onCheckedChange={(v) =>
                    updateAdvanced('disable_logs', !!v)
                  }
                />
                <FieldLabel htmlFor='disable_logs' className='text-sm'>
                  Disable logs
                </FieldLabel>
              </Field>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value='advanced'>
        <AccordionTrigger className='text-sm font-medium'>
          Advanced / niche
        </AccordionTrigger>
        <AccordionContent>
          <div className='grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2'>
            <Field>
              <FieldLabel className='mb-1 block text-muted-foreground'>
                Cron restart
              </FieldLabel>
              <Input
                placeholder='0 0 * * *'
                value={advanced.cron_restart}
                onChange={(e) => updateAdvanced('cron_restart', e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel className='mb-1 block text-muted-foreground'>
                Post update (comma separated)
              </FieldLabel>
              <Input
                placeholder='npm install'
                value={advanced.post_update}
                onChange={(e) => updateAdvanced('post_update', e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel className='mb-1 block text-muted-foreground'>
                Instance var
              </FieldLabel>
              <Input
                placeholder='INSTANCE_ID'
                value={advanced.instance_var}
                onChange={(e) => updateAdvanced('instance_var', e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel className='mb-1 block text-muted-foreground'>
                Increment var
              </FieldLabel>
              <Input
                placeholder='PORT'
                value={advanced.increment_var}
                onChange={(e) =>
                  updateAdvanced('increment_var', e.target.value)
                }
              />
            </Field>
            <Field className='sm:col-span-2'>
              <FieldLabel className='mb-1 block text-muted-foreground'>
                Filter env (comma separated)
              </FieldLabel>
              <Input
                placeholder='EXAMPLE_'
                value={advanced.filter_env}
                onChange={(e) => updateAdvanced('filter_env', e.target.value)}
              />
            </Field>
            <div className='flex items-center gap-6 sm:col-span-2'>
              <Field orientation='horizontal' className='w-fit flex-none'>
                <Checkbox
                  id='vizion'
                  checked={advanced.vizion}
                  onCheckedChange={(v) => updateAdvanced('vizion', !!v)}
                />
                <FieldLabel htmlFor='vizion' className='text-sm'>
                  Vizion (git versioning)
                </FieldLabel>
              </Field>
              <Field orientation='horizontal' className='w-fit flex-none'>
                <Checkbox
                  id='force'
                  checked={advanced.force}
                  onCheckedChange={(v) => updateAdvanced('force', !!v)}
                />
                <FieldLabel htmlFor='force' className='text-sm'>
                  Force
                </FieldLabel>
              </Field>
              <Field orientation='horizontal' className='w-fit flex-none'>
                <Checkbox
                  id='source_map_support'
                  checked={advanced.source_map_support}
                  onCheckedChange={(v) =>
                    updateAdvanced('source_map_support', !!v)
                  }
                />
                <FieldLabel htmlFor='source_map_support' className='text-sm'>
                  Source map support
                </FieldLabel>
              </Field>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}