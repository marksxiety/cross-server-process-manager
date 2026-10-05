import { useMemo, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { catalogField, catalogFields, groupTemplateKeys } from '@/lib/process-fields'
import { cn } from '@/lib/utils'
import type { FieldGroup } from '@/lib/process-fields'
import type { TemplateKey } from '@/types/template'

type ProcessFormMode = 'process' | 'template'

interface ProcessFormProps {
  /** Rows to render. Hidden filtering is the caller's responsibility. */
  fields: TemplateKey[]
  errors?: Record<string, string>
  onChange: (propertyKey: string, value: string) => void
  /** Template mode: updates the required/hidden flags of an existing row. */
  onUpdate?: (propertyKey: string, patch: Partial<TemplateKey>) => void
  /** Template mode: removes a row. */
  onRemove?: (propertyKey: string) => void
  /** Template mode: appends a catalog row. */
  onAdd?: (propertyKey: string) => void
  /** Template mode: catalog keys that are not part of the template yet. */
  addableKeys?: readonly string[]
  mode?: ProcessFormMode
}

const WIDE_FIELD_KEYS = new Set(['cwd', 'interpreter', 'script'])

function isWideField(field: TemplateKey): boolean {
  return (
    field.data_type === 'array' ||
    field.data_type === 'object' ||
    WIDE_FIELD_KEYS.has(field.property_key)
  )
}

function FieldControl({
  field,
  onChange,
}: {
  field: TemplateKey
  onChange: (value: string) => void
}) {
  const value = field.property_value ?? ''
  const spec = catalogField(field.property_key)

  if (field.data_type === 'boolean') {
    return (
      <Switch
        checked={value === 'true'}
        onCheckedChange={(checked) => onChange(checked ? 'true' : 'false')}
      />
    )
  }

  if (spec?.options) {
    return (
      <Select value={value} onValueChange={(next) => onChange(next ?? '')}>
        <SelectTrigger className='w-full'>
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

  if (field.data_type === 'array' || field.data_type === 'object') {
    return (
      <textarea
        className='min-h-20 w-full rounded-md border border-input bg-input/20 p-2 font-mono text-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30'
        placeholder={
          spec?.placeholder ??
          (field.data_type === 'array' ? '["--port", "3000"]' : '{ "NODE_ENV": "production" }')
        }
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    )
  }

  if (field.data_type === 'number') {
    return (
      <Input
        className='font-mono text-xs'
        type={field.property_key === 'instances' ? 'text' : 'number'}
        inputMode='numeric'
        placeholder={spec?.placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    )
  }

  return (
    <Input
      className='font-mono text-xs'
      placeholder={spec?.placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

function ProcessField({
  field,
  error,
  onChange,
}: {
  field: TemplateKey
  error: string | undefined
  onChange: (value: string) => void
}) {
  const required = field.is_required || catalogField(field.property_key)?.isRequired === true

  return (
    <Field data-invalid={!!error}>
      <div className='flex items-center justify-between gap-2'>
        <FieldLabel htmlFor={field.property_key} className='text-muted-foreground'>
          {field.property_key}
          {required && <span className='text-destructive'>*</span>}
        </FieldLabel>
        <span className='text-[10px] tracking-wide text-muted-foreground uppercase'>
          {field.data_type}
        </span>
      </div>
      <FieldControl field={field} onChange={onChange} />
      <FieldError errors={[error ? { message: error } : undefined]} />
    </Field>
  )
}

function TemplateFieldRow({
  field,
  onChange,
  onUpdate,
  onRemove,
}: {
  field: TemplateKey
  onChange: (value: string) => void
  onUpdate: (patch: Partial<TemplateKey>) => void
  onRemove: () => void
}) {
  return (
    <div className='space-y-2 rounded-md border p-3'>
      <div className='flex items-center justify-between gap-2'>
        <span className='font-mono text-xs font-medium'>{field.property_key}</span>
        <div className='flex items-center gap-3'>
          <label className='flex items-center gap-1.5 text-[11px] text-muted-foreground'>
            <Checkbox
              checked={field.is_required}
              onCheckedChange={(checked) => onUpdate({ is_required: checked === true })}
            />
            Required
          </label>
          <label className='flex items-center gap-1.5 text-[11px] text-muted-foreground'>
            <Checkbox
              checked={field.is_hidden}
              onCheckedChange={(checked) => onUpdate({ is_hidden: checked === true })}
            />
            Hidden
          </label>
          <Button
            type='button'
            variant='ghost'
            size='icon-sm'
            aria-label={`Remove ${field.property_key}`}
            title='Remove field'
            onClick={onRemove}
          >
            <X strokeWidth={2} />
          </Button>
        </div>
      </div>
      <div className='flex items-center gap-2'>
        <span className='w-20 shrink-0 text-[10px] tracking-wide text-muted-foreground uppercase'>
          {field.data_type}
        </span>
        <div className='min-w-0 flex-1'>
          <FieldControl field={field} onChange={onChange} />
        </div>
      </div>
    </div>
  )
}

function AddFieldSelect({
  group,
  addableKeys,
  onAdd,
}: {
  group: FieldGroup
  addableKeys: readonly string[]
  onAdd: (propertyKey: string) => void
}) {
  const options = catalogFields(group).filter((field) => addableKeys.includes(field.key))
  if (options.length === 0) return null

  return (
    <Select value='' onValueChange={(key) => key && onAdd(key)}>
      <SelectTrigger className='w-full'>
        <SelectValue placeholder='Add a field…' />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.key} value={option.key}>
            {option.key}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
 * Renders the process configuration as two cards (Basic and Advanced). Process
 * registration and template editing share this layout; validation and
 * submission stay with the page that owns them.
 */
export function ProcessForm({
  fields,
  errors = {},
  onChange,
  onUpdate,
  onRemove,
  onAdd,
  addableKeys = [],
  mode = 'process',
}: ProcessFormProps) {
  const { basic, advanced } = useMemo(() => groupTemplateKeys(fields), [fields])

  const hasAdvancedError = advanced.some((field) => errors[field.property_key] !== undefined)
  const [advancedOpen, setAdvancedOpen] = useState(mode === 'template')
  // Errors force the card open so advanced issues can never be missed.
  const advancedExpanded = advancedOpen || hasAdvancedError

  const renderFields = (group: FieldGroup, groupFields: TemplateKey[]) => (
    <div className={cn('gap-4', mode === 'process' ? 'grid grid-cols-1 sm:grid-cols-2' : 'space-y-3')}>
      {groupFields.length === 0 && mode === 'template' && (
        <p className='text-sm text-muted-foreground'>No {group} fields.</p>
      )}
      {groupFields.map((field) =>
        mode === 'template' ? (
          <TemplateFieldRow
            key={field.property_key}
            field={field}
            onChange={(value) => onChange(field.property_key, value)}
            onUpdate={(patch) => onUpdate?.(field.property_key, patch)}
            onRemove={() => onRemove?.(field.property_key)}
          />
        ) : (
          <div key={field.property_key} className={cn(isWideField(field) && 'sm:col-span-2')}>
            <ProcessField
              field={field}
              error={errors[field.property_key]}
              onChange={(value) => onChange(field.property_key, value)}
            />
          </div>
        ),
      )}
      {mode === 'template' && onAdd && (
        <AddFieldSelect group={group} addableKeys={addableKeys} onAdd={onAdd} />
      )}
    </div>
  )

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader>
          <CardTitle>Basic</CardTitle>
          <CardDescription>
            Identity, runtime and execution settings for the process.
          </CardDescription>
        </CardHeader>
        <CardContent>{renderFields('basic', basic)}</CardContent>
      </Card>

      <Card>
        <Collapsible open={advancedExpanded} onOpenChange={setAdvancedOpen}>
          <CardHeader>
            <div className='flex items-start justify-between gap-2'>
              <div className='space-y-1.5'>
                <CardTitle>Advanced</CardTitle>
                <CardDescription>
                  Stability, scaling and recovery. Defaults are pre-filled.
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
            <CardContent>{renderFields('advanced', advanced)}</CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  )
}
