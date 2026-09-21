import type { ProcessDescribe } from '@/types/process'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—'
  return String(value)
}

function DescribeSection({ label, value }: { label: string; value: unknown }) {
  if (isPlainObject(value)) {
    return (
      <section className='space-y-1.5'>
        <h3 className='font-medium text-foreground'>{label}</h3>
        <div className='space-y-1.5 pl-3'>
          {Object.entries(value).map(([key, child]) => (
            <DescribeSection key={key} label={key} value={child} />
          ))}
        </div>
      </section>
    )
  }

  return (
    <div className='flex items-start justify-between gap-4 py-0.5'>
      <span className='shrink-0 text-muted-foreground'>{label}</span>
      <span className='min-w-0 break-all text-right'>{formatValue(value)}</span>
    </div>
  )
}

export function ProcessDescribe({ data }: { data: ProcessDescribe }) {
  return (
    <div className='flex-1 space-y-4 overflow-y-auto px-6 pb-6'>
      {Object.entries(data).map(([key, value]) => (
        <DescribeSection key={key} label={key} value={value} />
      ))}
    </div>
  )
}
