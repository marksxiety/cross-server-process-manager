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
import { PageHeader } from '@/components/custom/page-header'
import { ServerTable } from '@/components/custom/server-table'
import { useServerStore } from '@/stores/server.store'

type StatusFilter = 'all' | 'active' | 'inactive'

export function Server() {
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [filter, setFilter] = useState<StatusFilter>('all')
  const servers = useServerStore((state) => state.servers)
  const status = useServerStore((state) => state.status)
  const error = useServerStore((state) => state.error)
  const load = useServerStore((state) => state.load)

  useEffect(() => {
    void load()
  }, [load])

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

        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <Button size='sm' onClick={() => setIsSheetOpen(true)}>
            <Plus strokeWidth={2} />
            Register server
          </Button>
          <SheetContent className='sm:max-w-md'>
            <SheetHeader>
              <SheetTitle>Register server</SheetTitle>
              <SheetDescription>
                Add a new server to the fleet.
              </SheetDescription>
            </SheetHeader>

            <div className='flex-1 overflow-y-auto px-6'>
              <form id='register-server-form'>
                <FieldSet>
                  <FieldGroup className='grid grid-cols-2 gap-3'>
                    <Field>
                      <FieldLabel htmlFor='server'>Server</FieldLabel>
                      <Input id='server' placeholder='prod-web-1' />
                      <FieldError />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor='protocol'>Protocol</FieldLabel>
                      <Select>
                        <SelectTrigger id='protocol'>
                          <SelectValue placeholder='http' />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='http'>http</SelectItem>
                          <SelectItem value='https'>https</SelectItem>
                        </SelectContent>
                      </Select>
                      <FieldError />
                    </Field>
                  </FieldGroup>

                  <FieldGroup className='grid grid-cols-3 gap-3 mt-3'>
                    <Field className='col-span-2'>
                      <FieldLabel htmlFor='host'>Host</FieldLabel>
                      <Input id='host' placeholder='192.168.1.10' />
                      <FieldError />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor='port'>Port</FieldLabel>
                      <Input id='port' type='number' placeholder='4000' />
                      <FieldError />
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
                    <Switch id='is_active' />
                  </Field>
                </FieldSet>
              </form>
            </div>

            <SheetFooter className='grid grid-cols-2'>
              <Button type='button' variant='outline' className='w-full'>
                Clear
              </Button>
              <Button
                type='submit'
                form='register-server-form'
                className='w-full'
              >
                Register
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
          <ServerTable servers={filteredServers} />
        ) : (
          <p className='text-sm text-muted-foreground py-6'>
            No {filter} servers.
          </p>
        ))}
    </div>
  )
}