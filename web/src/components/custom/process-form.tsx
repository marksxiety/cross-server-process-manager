import { useMemo, useState } from 'react'
import { ChevronDown, Plus, X } from 'lucide-react'
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
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  ADVANCED_GROUPS,
  advancedFields,
  advancedGroupFields,
  basicFields,
  isFieldEnabled,
} from '@/lib/process-fields'
import { cn } from '@/lib/utils'
import type { ProcessFieldSpec } from '@/lib/process-fields'
import type { TemplateValues } from '@/types/template'

interface ProcessFormProps {
  /** Sparse map of PM2 option keys to values; missing keys are untouched. */
  values: TemplateValues
  errors?: Record<string, string>
  onChange: (key: string, value: unknown) => void
}

const WIDE_FIELD_KEYS = new Set(['cwd', 'interpreter', 'script'])

function isWideField(spec: ProcessFieldSpec): boolean {
  return spec.type === 'array' || spec.type === 'object' || WIDE_FIELD_KEYS.has(spec.key)
}

function typeTag(spec: ProcessFieldSpec): string {
  return spec.type.toUpperCase()
}

// ---------------------------------------------------------------------------
// Value controls
// ---------------------------------------------------------------------------

function TagInput({
  spec,
  value,
  disabled,
  invalid,
  onChange,
}: {
  spec: ProcessFieldSpec
  value: unknown
  disabled: boolean
  invalid: boolean
  onChange: (value: string[]) => void
}) {
  const tags = Array.isArray(value) ? (value as string[]) : []
  const [draft, setDraft] = useState('')

  const commit = () => {
    const next = draft.trim()
    if (next === '') return
    onChange([...tags, next])
    setDraft('')
  }

  const removeAt = (index: number) => onChange(tags.filter((_, i) => i !== index))

  return (
    <div className={cn(disabled && 'opacity-60')}>
      <div className='flex gap-2'>
        <Input
          className='font-mono text-xs'
          value={draft}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          placeholder={spec.placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commit()
            } else if (event.key === 'Backspace' && draft === '' && tags.length > 0) {
              removeAt(tags.length - 1)
            }
          }}
        />
        <Button
          type='button'
          variant='outline'
          size='icon'
          disabled={disabled || draft.trim() === ''}
          aria-label={`Add to ${spec.key}`}
          onClick={commit}
        >
          <Plus strokeWidth={2} />
        </Button>
      </div>
      {tags.length > 0 && (
        <div className='mt-2 flex flex-wrap gap-1.5'>
          {tags.map((tag, index) => (
            <span
              key={`${tag}-${index}`}
              className='inline-flex items-center gap-1 rounded-md border bg-muted/40 py-0.5 pr-1 pl-2 font-mono text-[11px]'
            >
              {tag}
              <button
                type='button'
                disabled={disabled}
                aria-label={`Remove ${tag}`}
                className='rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none'
                onClick={() => removeAt(index)}
              >
                <X className='size-3' strokeWidth={2} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

type EnvRow = { key: string; value: string }

function rowsFromObject(value: unknown): EnvRow[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return []
  return Object.entries(value as Record<string, unknown>).map(([key, entry]) => ({
    key,
    value: entry === null || entry === undefined ? '' : String(entry),
  }))
}

function rowsToObject(rows: EnvRow[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const row of rows) {
    const key = row.key.trim()
    if (key === '') continue
    out[key] = row.value
  }
  return out
}

function KeyValueEditor({
  value,
  disabled,
  onChange,
}: {
  value: unknown
  disabled: boolean
  onChange: (value: Record<string, string>) => void
}) {
  const serialized = JSON.stringify(value ?? {})
  const [rows, setRows] = useState<EnvRow[]>(() => rowsFromObject(value))
  const [synced, setSynced] = useState(serialized)

  // Adjust state during render (React's documented pattern) instead of an
  // effect: reseed only when the incoming object no longer matches what the
  // local rows produce, so blank in-progress rows survive while typing.
  if (synced !== serialized) {
    setSynced(serialized)
    if (JSON.stringify(rowsToObject(rows)) !== serialized) {
      setRows(rowsFromObject(value))
    }
  }

  const update = (next: EnvRow[]) => {
    setRows(next)
    onChange(rowsToObject(next))
  }

  return (
    <div className={cn('space-y-2', disabled && 'opacity-60')}>
      {rows.map((row, index) => (
        <div key={index} className='flex gap-2'>
          <Input
            className='font-mono text-xs'
            placeholder='KEY'
            disabled={disabled}
            value={row.key}
            onChange={(event) =>
              update(rows.map((r, i) => (i === index ? { ...r, key: event.target.value } : r)))
            }
          />
          <Input
            className='font-mono text-xs'
            placeholder='value'
            disabled={disabled}
            value={row.value}
            onChange={(event) =>
              update(rows.map((r, i) => (i === index ? { ...r, value: event.target.value } : r)))
            }
          />
          <Button
            type='button'
            variant='outline'
            size='icon'
            disabled={disabled}
            aria-label='Remove variable'
            onClick={() => update(rows.filter((_, i) => i !== index))}
          >
            <X strokeWidth={2} />
          </Button>
        </div>
      ))}
      <Button
        type='button'
        variant='outline'
        size='sm'
        disabled={disabled}
        onClick={() => update([...rows, { key: '', value: '' }])}
      >
        <Plus strokeWidth={2} />
        Add variable
      </Button>
    </div>
  )
}

function FieldControl({
  spec,
  value,
  disabled,
  invalid,
  onChange,
}: {
  spec: ProcessFieldSpec
  value: unknown
  disabled: boolean
  invalid: boolean
  onChange: (value: unknown) => void
}) {
  if (spec.type === 'boolean') {
    const resting = spec.defaultValue === true
    const checked = value === undefined ? resting : value === true || value === 'true'
    return (
      <Switch
        checked={checked}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        onCheckedChange={(next) => onChange(next === true)}
      />
    )
  }

  if (spec.select && spec.options) {
    return (
      <Select
        value={typeof value === 'string' ? value : ''}
        onValueChange={(next) => onChange(next ?? '')}
      >
        <SelectTrigger className='w-full' disabled={disabled} aria-invalid={invalid || undefined}>
          <SelectValue placeholder='Select a value' />
        </SelectTrigger>
        <SelectContent>
          {spec.options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  if (spec.combobox && spec.options) {
    const listId = `list-${spec.key}`
    return (
      <>
        <Input
          className='font-mono text-xs'
          list={listId}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          placeholder={spec.placeholder}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value)}
        />
        <datalist id={listId}>
          {spec.options.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      </>
    )
  }

  if (spec.type === 'array') {
    return (
      <TagInput spec={spec} value={value} disabled={disabled} invalid={invalid} onChange={onChange} />
    )
  }

  if (spec.type === 'object') {
    return <KeyValueEditor value={value} disabled={disabled} onChange={onChange} />
  }

  const isNumeric = spec.type === 'number' || spec.type === 'duration'
  return (
    <Input
      className='font-mono text-xs'
      type='text'
      inputMode={isNumeric ? 'numeric' : undefined}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      placeholder={spec.placeholder}
      value={typeof value === 'string' || typeof value === 'number' ? String(value) : ''}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

function ProcessField({
  spec,
  value,
  error,
  values,
  onChange,
}: {
  spec: ProcessFieldSpec
  value: unknown
  error: string | undefined
  values: TemplateValues
  onChange: (value: unknown) => void
}) {
  const disabled = !isFieldEnabled(spec, values)
  const showHint = spec.hint !== undefined && (spec.enabledWhen === undefined || disabled)
  const invalid = !!error

  return (
    <Field data-disabled={disabled}>
      <div className='flex items-center justify-between gap-2'>
        <FieldLabel htmlFor={spec.key} className='text-muted-foreground'>
          {spec.key}
          {spec.required && <span className='text-destructive'>*</span>}
        </FieldLabel>
        <span className='text-[10px] tracking-wide text-muted-foreground uppercase'>
          {typeTag(spec)}
        </span>
      </div>
      <FieldControl
        spec={spec}
        value={value}
        disabled={disabled}
        invalid={invalid}
        onChange={onChange}
      />
      {showHint && <p className='text-[11px] text-muted-foreground'>{spec.hint}</p>}
      <FieldError errors={[error ? { message: error } : undefined]} />
    </Field>
  )
}

/**
 * Renders the process configuration as two cards (Basic and Advanced) from the
 * master field list. Process registration and template editing share this
 * component; validation and submission stay with the page that owns them.
 */
export function ProcessForm({ values, errors = {}, onChange }: ProcessFormProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const hasAdvancedError = useMemo(
    () => advancedFields().some((spec) => errors[spec.key] !== undefined),
    [errors],
  )
  const advancedExpanded = advancedOpen || hasAdvancedError

  const renderField = (spec: ProcessFieldSpec) => (
    <div key={spec.key} className={cn(isWideField(spec) && 'sm:col-span-2')}>
      <ProcessField
        spec={spec}
        value={values[spec.key]}
        error={errors[spec.key]}
        values={values}
        onChange={(next) => onChange(spec.key, next)}
      />
    </div>
  )

  return (
    <div className='space-y-4 m-2'>
      <Card>
        <CardHeader>
          <CardTitle>Basic</CardTitle>
          <CardDescription>
            Identity, runtime and execution settings for the process.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            {basicFields().map(renderField)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <Collapsible open={advancedExpanded} onOpenChange={setAdvancedOpen}>
          <CardHeader>
            <div className='flex items-start justify-between gap-2'>
              <div className='space-y-1.5'>
                <CardTitle>Advanced</CardTitle>
                <CardDescription>
                  Stability, scheduling and recovery. Leave blank to use agent defaults.
                </CardDescription>
              </div>
              <CollapsibleTrigger
                render={
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon-sm'
                    aria-label='Toggle advanced settings'
                    title='Toggle advanced settings'
                  />
                }
              >
                <ChevronDown
                  strokeWidth={2}
                  className={cn('transition-transform', advancedExpanded && 'rotate-180')}
                />
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className='space-y-6'>
              {ADVANCED_GROUPS.map((group) => (
                <div key={group.id}>
                  <div className='mb-3 flex items-center gap-3'>
                    <span className='text-[10px] font-medium tracking-wide text-muted-foreground uppercase'>
                      {group.label}
                    </span>
                    <Separator className='flex-1' />
                  </div>
                  <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                    {advancedGroupFields(group.id).map(renderField)}
                  </div>
                </div>
              ))}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  )
}
