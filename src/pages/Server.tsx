import { useEffect, useMemo, useState } from 'react'
import { Plus, ServerOff } from 'lucide-react'
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldSeparator,
  FieldSet,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import { toast } from '@/components/ui/toast'
import { PageHeader } from '@/components/custom/page-header'
import { ServerTable } from '@/components/custom/server-table'
import { useServerStore } from '@/stores/server.store'
import { serverService } from '@/api/services/server.service'
import {
  registerServerSchema,
  type RegisterServerInput,
  type RegisterServerValues,
} from '@/schemas/server.schema'
import type { RegisteredServer } from '@/types/server'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'

type StatusFilter = 'all' | 'active' | 'inactive'

const DEFAULT_FORM_VALUES: RegisterServerInput = {
  server: '',
  protocol: 'http',
  host: '',
  port: 4000,
  is_active: true,
}

function toFormValues(server: RegisteredServer): RegisterServerValues {
  return {
    server: server.server,
    protocol: server.protocol,
    host: server.host,
    port: server.port,
    is_active: server.is_active,
  }
}

export function Server() {
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [editingServer, setEditingServer] = useState<RegisteredServer | null>(null)
  const [filter, setFilter] = useState<StatusFilter>('all')
  const servers = useServerStore((state) => state.servers)
  const status = useServerStore((state) => state.status)
  const error = useServerStore((state) => state.error)
  const load = useServerStore((state) => state.load)
  const reload = useServerStore((state) => state.reload)

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RegisterServerInput, unknown, RegisterServerValues>({
    resolver: zodResolver(registerServerSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  })

  useEffect(() => {
    void load()
  }, [load])

  const openRegister = () => {
    setEditingServer(null)
    reset(DEFAULT_FORM_VALUES)
    setIsSheetOpen(true)
  }

  const openEdit = (server: RegisteredServer) => {
    setEditingServer(server)
    reset(toFormValues(server))
    setIsSheetOpen(true)
  }

  const handleSheetOpenChange = (open: boolean) => {
    setIsSheetOpen(open)
    if (!open) setEditingServer(null)
  }

  const onSubmit = handleSubmit(async (values) => {
    const target = editingServer
    const isEditing = target !== null

    const request = (
      target
        ? serverService().update(target.id, values)
        : serverService().register(values)
    ).then((result) => {
      if (!result.success) throw new Error(result.message)
      return result
    })

    try {
      await toast.promise(request, {
        loading: {
          title: isEditing ? 'Updating server…' : 'Registering server…',
        },
        success: {
          title: isEditing ? 'Server updated' : 'Server registered',
          description: isEditing
            ? `${values.server} was updated.`
            : `${values.server} was added.`,
        },
        error: (error) => ({
          title: isEditing ? 'Update failed' : 'Registration failed',
          description: error instanceof Error ? error.message : String(error),
        }),
      })

      await reload()
      reset(DEFAULT_FORM_VALUES)
      setIsSheetOpen(false)
      setEditingServer(null)
    } catch {
      // toast.promise already surfaced the error; keep the sheet open.
    }
  })

  const counts = useMemo(
    () => ({
      all: servers.length,
      active: servers.filter((s) => s.is_active).length,
      inactive: servers.filter((s) => !s.is_active).length,
    }),
    [servers],
  )

  const filteredServers = useMemo(() => {
    if (filter === 'all') return servers
    return servers.filter((s) =>
      filter === 'active' ? s.is_active : !s.is_active,
    )
  }, [servers, filter])

  return (
    <div className='mx-auto w-full max-w-[75%]'>
      <PageHeader
        title='Servers'
        description="Manage the fleet's registered servers, including inactive ones."
      >
        <Tabs value={filter} onValueChange={(v) => setFilter(v as StatusFilter)}>
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

        <Sheet open={isSheetOpen} onOpenChange={handleSheetOpenChange}>
          <Button size='sm' onClick={openRegister}>
            <Plus strokeWidth={2} />
            Register server
          </Button>
          <SheetContent size='md'>
            <SheetHeader>
              <SheetTitle>
                {editingServer ? 'Edit server' : 'Register server'}
              </SheetTitle>
              <SheetDescription>
                {editingServer
                  ? 'Update the selected server in the fleet.'
                  : 'Add a new server to the fleet.'}
              </SheetDescription>
            </SheetHeader>

            <div className='flex-1 overflow-y-auto px-6'>
              <form id='server-form' onSubmit={onSubmit}>
                <FieldSet>
                  <FieldGroup className='grid grid-cols-2 gap-3'>
                    <Field data-invalid={!!errors.server}>
                      <FieldLabel htmlFor='server'>Server</FieldLabel>
                      <Input id='server' aria-invalid={!!errors.server} {...register('server')} />
                      <FieldError errors={[errors.server]} />
                    </Field>
                    <Field data-invalid={!!errors.protocol}>
                      <FieldLabel htmlFor='protocol'>Protocol</FieldLabel>
                      <Controller
                        control={control}
                        name='protocol'
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger
                              id='protocol'
                              aria-invalid={!!errors.protocol}
                            >
                              <SelectValue placeholder='http' />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value='http'>http</SelectItem>
                              <SelectItem value='https'>https</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <FieldError errors={[errors.protocol]} />
                    </Field>
                  </FieldGroup>

                  <FieldGroup className='grid grid-cols-3 gap-3 mt-3'>
                    <Field className='col-span-2' data-invalid={!!errors.host}>
                      <FieldLabel htmlFor='host'>Host</FieldLabel>
                      <Input
                        id='host'
                        placeholder='192.168.1.10'
                        aria-invalid={!!errors.host}
                        {...register('host')}
                      />
                      <FieldError errors={[errors.host]} />
                    </Field>

                    <Field data-invalid={!!errors.port}>
                      <FieldLabel htmlFor='port'>Port</FieldLabel>
                      <Input
                        id='port'
                        type='number'
                        placeholder='4000'
                        aria-invalid={!!errors.port}
                        {...register('port')}
                      />
                      <FieldError errors={[errors.port]} />
                    </Field>
                  </FieldGroup>

                  <FieldSeparator className='my-4' />

                  <Field
                    orientation='horizontal'
                    className='flex items-center justify-between'
                  >
                    <div>
                      <FieldLabel htmlFor='is_active'>Active</FieldLabel>
                      <FieldDescription>
                        Include in dashboard display.
                      </FieldDescription>
                    </div>
                    <Controller
                      control={control}
                      name='is_active'
                      render={({ field }) => (
                        <Switch
                          id='is_active'
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                  </Field>
                </FieldSet>
              </form>
            </div>

            <SheetFooter className='grid grid-cols-2'>
              <Button
                type='button'
                variant='outline'
                className='w-full'
                disabled={isSubmitting}
                onClick={() =>
                  reset(editingServer ? toFormValues(editingServer) : DEFAULT_FORM_VALUES)
                }
              >
                {editingServer ? 'Reset' : 'Clear'}
              </Button>
              <Button
                type='submit'
                form='server-form'
                className='w-full'
                disabled={isSubmitting}
              >
                {isSubmitting && <Spinner className='size-4' />}
                {editingServer ? 'Save changes' : 'Register'}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </PageHeader>

      {status === 'loading' && (
        <div className='flex items-center gap-2 text-sm text-muted-foreground py-6'>
          <Spinner className='size-4' />
          Loading servers…
        </div>
      )}

      {status === 'error' && (
        <p className='text-sm text-destructive py-6'>{error}</p>
      )}

      {status === 'success' && servers.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <ServerOff strokeWidth={2} />
            </EmptyMedia>
            <EmptyTitle>No registered servers</EmptyTitle>
            <EmptyDescription>
              Servers you register will appear here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {status === 'success' &&
        servers.length > 0 &&
        (filteredServers.length > 0 ? (
          <ServerTable servers={filteredServers} onEdit={openEdit} />
        ) : (
          <p className='text-sm text-muted-foreground py-6'>
            No {filter} servers.
          </p>
        ))}
    </div>
  )
}