import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { FileText, Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Spinner } from '@/components/ui/spinner'
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
import { TemplateModal } from '@/components/custom/template-modal'
import { useTemplateStore } from '@/stores/template.store'
import { toSavableKeys } from '@/lib/template-keys'
import type { ApiResponse } from '@/types/api'
import type { ProcessTemplate, TemplateKey } from '@/types/template'

type StatusFilter = 'all' | 'active' | 'inactive'

export function Template() {
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [selected, setSelected] = useState<ProcessTemplate | null>(null)
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

  const handleUse = (template: ProcessTemplate) => {
    void navigate(`/process?template=${template.id}`)
  }

  const handleSave = async (keys: TemplateKey[]): Promise<ApiResponse<ProcessTemplate>> => {
    if (!selected) {
      return { success: false, message: 'No template selected', info: null, status: 0 }
    }
    return save(selected.id, toSavableKeys(keys))
  }

  const handleDelete = (template: ProcessTemplate): Promise<ApiResponse<ProcessTemplate>> =>
    remove(template.id)

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
                      onOpen={setSelected}
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
        <TemplateModal
          key={selected.id}
          template={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null)
          }}
          onUse={handleUse}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}
