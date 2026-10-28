import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Search, ShieldCheck, X } from 'lucide-react'
import { adminService } from '@/api/services/admin.service'
import { CustomTable, MobileCard } from '@/components/custom/custom-table'
import { ErrorAlert } from '@/components/custom/error-alert'
import { PageHeader } from '@/components/custom/page-header'
import { UserAvatar } from '@/components/custom/user-avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { TableCell, TableHead, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/components/ui/toast'
import { buildActionGroups } from '@/lib/admin-access'
import { errorCodeLabel, toApiError } from '@/lib/error-code'
import { cn } from '@/lib/utils'
import type { ApiError } from '@/types/api'
import type { AdminCatalog, AdminUser } from '@/types/admin'

type UserFilter = 'all' | 'admin' | 'inactive'

const PAGE_DESCRIPTIONS: Record<string, string> = {
  process: 'Register new processes.',
  templates: 'View and manage templates.',
  servers: 'Manage registered servers.',
  server_metrics: 'Read-only server metrics.',
}

function setHas<T>(values: Iterable<T>, value: T, checked: boolean): Set<T> {
  const next = new Set(values)
  if (checked) next.add(value)
  else next.delete(value)
  return next
}

function sameSet<T>(a: Set<T>, b: Iterable<T>): boolean {
  const other = new Set(b)
  if (a.size !== other.size) return false
  for (const value of a) if (!other.has(value)) return false
  return true
}

function RoleBadges({ user }: { user: AdminUser }) {
  return (
    <div className='flex flex-wrap items-center gap-1'>
      {user.is_admin ? (
        <Badge className='font-normal'>Admin</Badge>
      ) : (
        <Badge variant='secondary' className='font-normal'>
          Member
        </Badge>
      )}
      {user.is_env_admin && (
        <Badge variant='outline' className='font-normal'>
          ENV
        </Badge>
      )}
    </div>
  )
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <Badge variant={isActive ? 'success' : 'secondary'}>
      {isActive ? 'Active' : 'Inactive'}
    </Badge>
  )
}

export function AdminPanel() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [catalog, setCatalog] = useState<AdminCatalog | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [requestError, setRequestError] = useState<ApiError | null>(null)

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<UserFilter>('all')

  const [managing, setManaging] = useState<AdminUser | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [pages, setPages] = useState<Set<string>>(new Set())
  const [events, setEvents] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    const [userResult, catalogResult] = await Promise.all([
      adminService().listUsers(),
      adminService().catalog(),
    ])

    if (!userResult.success || !userResult.info) {
      setRequestError(toApiError(userResult))
      setIsLoading(false)
      return
    }
    if (!catalogResult.success || !catalogResult.info) {
      setRequestError(toApiError(catalogResult))
      setIsLoading(false)
      return
    }

    setUsers(userResult.info)
    setCatalog(catalogResult.info)
    setRequestError(null)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [load])

  const pageRows = useMemo(
    () =>
      catalog?.pages.filter((page) => page.key !== catalog.implicit_page) ?? [],
    [catalog],
  )
  const actionGroups = useMemo(
    () => (catalog ? buildActionGroups(catalog) : []),
    [catalog],
  )
  const allEventKeys = useMemo(
    () => catalog?.events.map((event) => event.key) ?? [],
    [catalog],
  )
  const totalActions = allEventKeys.length

  const counts = useMemo(
    () => ({
      all: users.length,
      admin: users.filter((user) => user.is_admin).length,
      inactive: users.filter((user) => !user.is_active).length,
    }),
    [users],
  )

  const visibleUsers = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return users.filter((user) => {
      if (filter === 'admin' && !user.is_admin) return false
      if (filter === 'inactive' && user.is_active) return false
      if (!needle) return true
      return (
        user.name.toLowerCase().includes(needle) ||
        user.email.toLowerCase().includes(needle)
      )
    })
  }, [users, query, filter])

  const accessSummary = (user: AdminUser) => {
    if (user.is_admin) return 'Full access'
    const pageCount = user.pages.filter(
      (page) => page !== catalog?.implicit_page,
    ).length
    if (pageCount === 0 && user.events.length === 0) return 'Dashboard only'
    return `${pageCount + 1} of ${pageRows.length + 1} pages · ${user.events.length} of ${totalActions} actions`
  }

  const openManage = (user: AdminUser) => {
    setManaging(user)
    setName(user.name)
    setEmail(user.email)
    setIsActive(user.is_active)
    setIsAdmin(user.is_admin)
    setPages(
      new Set(user.pages.filter((page) => page !== catalog?.implicit_page)),
    )
    setEvents(new Set(user.events))
    setIsSheetOpen(true)
  }

  const closeSheet = () => {
    setIsSheetOpen(false)
    setManaging(null)
  }

  const protectedAdmin = managing?.is_env_admin === true
  const accessDisabled = protectedAdmin || isAdmin

  const isDirty = useMemo(() => {
    if (!managing) return false
    return (
      name !== managing.name ||
      email !== managing.email ||
      isActive !== managing.is_active ||
      isAdmin !== managing.is_admin ||
      !sameSet(
        pages,
        managing.pages.filter((page) => page !== catalog?.implicit_page),
      ) ||
      !sameSet(events, managing.events)
    )
  }, [managing, name, email, isActive, isAdmin, pages, events, catalog])

  const toggleGroup = (keys: string[], checked: boolean) =>
    setEvents((current) => {
      const next = new Set(current)
      for (const key of keys) {
        if (checked) next.add(key)
        else next.delete(key)
      }
      return next
    })

  const grantAll = () => {
    setPages(new Set(pageRows.map((page) => page.key)))
    setEvents(new Set(allEventKeys))
  }

  const clearAll = () => {
    setPages(new Set())
    setEvents(new Set())
  }

  const save = async () => {
    if (!managing) return

    const request = (async () => {
      const userResult = await adminService().updateUser(managing.id, {
        name,
        email,
        is_active: isActive,
        is_admin: isAdmin,
      })
      if (!userResult.success) throw toApiError(userResult)

      if (!accessDisabled) {
        const accessResult = await adminService().updateAccess(managing.id, {
          pages: [...pages],
          events: [...events],
        })
        if (!accessResult.success) throw toApiError(accessResult)
      }

      return userResult
    })()

    setIsSaving(true)
    try {
      await toast.promise(request, {
        loading: { title: 'Saving user access…' },
        success: {
          title: 'User updated',
          description: `${name} (${email}) was updated.`,
        },
        error: (error: ApiError) => ({
          title: errorCodeLabel(error.code),
          description: error.message,
        }),
      })
      closeSheet()
      await load()
    } catch {
      // toast.promise already surfaced the error; keep the sheet open.
    } finally {
      setIsSaving(false)
    }
  }

  const filters: { key: UserFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'admin', label: 'Admins' },
    { key: 'inactive', label: 'Inactive' },
  ]

  const userCards = visibleUsers.map((user) => (
    <MobileCard key={user.id}>
      <div className='flex items-start justify-between gap-3'>
        <div className='flex min-w-0 items-center gap-3'>
          <UserAvatar name={user.name} />
          <div className='min-w-0'>
            <p className='truncate text-sm font-medium' title={user.name}>
              {user.name}
            </p>
            <p
              className='truncate text-xs text-muted-foreground'
              title={user.email}
            >
              {user.email}
            </p>
          </div>
        </div>
        <StatusBadge isActive={user.is_active} />
      </div>

      <div className='mt-3 flex items-end justify-between gap-2 border-t pt-3'>
        <div className='min-w-0 space-y-1'>
          <RoleBadges user={user} />
          <p className='text-xs text-muted-foreground'>
            {accessSummary(user)}
          </p>
        </div>
        <Button
          type='button'
          variant='ghost'
          size='icon-sm'
          aria-label={`Manage ${user.name}`}
          title={`Manage ${user.name}`}
          onClick={() => openManage(user)}
        >
          <Pencil strokeWidth={2} />
        </Button>
      </div>
    </MobileCard>
  ))

  return (
    <div className='min-w-0'>
      <PageHeader
        title='Admin Panel'
        description='Manage who can sign in and what they can do. Dashboard is always available.'
      >
        <Tabs
          value={filter}
          onValueChange={(value) => setFilter(value as UserFilter)}
        >
          <TabsList className='w-full overflow-hidden sm:w-fit'>
            {filters.map((item) => (
              <TabsTrigger key={item.key} value={item.key}>
                {item.label}
                <span className='ml-1.5 text-muted-foreground'>
                  {counts[item.key]}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className='relative w-full sm:max-w-56'>
          <Search
            aria-hidden='true'
            className='pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground'
            strokeWidth={2}
          />
          <Input
            size='xs'
            className='pl-7'
            value={query}
            placeholder='Search name or email…'
            aria-label='Search users'
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setQuery('')
            }}
          />
          {query !== '' && (
            <button
              type='button'
              aria-label='Clear search'
              title='Clear search'
              className='absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground'
              onClick={() => setQuery('')}
            >
              <X className='size-3.5' strokeWidth={2} />
            </button>
          )}
        </div>
      </PageHeader>

      {requestError && <ErrorAlert error={requestError} className='my-6' />}

      {!isLoading && !requestError && users.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant='icon'>
              <ShieldCheck strokeWidth={2} />
            </EmptyMedia>
            <EmptyTitle>No users</EmptyTitle>
            <EmptyDescription>
              Accounts registered in this environment will appear here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {!requestError &&
        (isLoading || users.length > 0) &&
        (visibleUsers.length > 0 || (isLoading && users.length === 0) ? (
          <CustomTable
            head={
              <>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className='hidden md:table-cell'>Access</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className='w-0 text-right'>Actions</TableHead>
              </>
            }
            mobile={userCards}
            loading={isLoading && users.length === 0}
            loadingLabel='Loading users…'
            colSpan={5}
          >
            {visibleUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className='flex min-w-0 items-center gap-3'>
                    <UserAvatar name={user.name} />
                    <div className='min-w-0'>
                      <p
                        className='max-w-48 truncate text-sm font-medium'
                        title={user.name}
                      >
                        {user.name}
                      </p>
                      <p
                        className='max-w-48 truncate text-xs text-muted-foreground'
                        title={user.email}
                      >
                        {user.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <RoleBadges user={user} />
                </TableCell>
                <TableCell className='hidden max-w-56 truncate text-xs text-muted-foreground md:table-cell'>
                  {accessSummary(user)}
                </TableCell>
                <TableCell>
                  <StatusBadge isActive={user.is_active} />
                </TableCell>
                <TableCell className='text-right'>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon-sm'
                    aria-label={`Manage ${user.name}`}
                    title={`Manage ${user.name}`}
                    onClick={() => openManage(user)}
                  >
                    <Pencil strokeWidth={2} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </CustomTable>
        ) : (
          <p className='py-6 text-sm text-muted-foreground'>
            No {filter} users.
          </p>
        ))}

      <Sheet
        open={isSheetOpen}
        onOpenChange={(open) => {
          if (!open && !isSaving) closeSheet()
        }}
      >
        <SheetContent size='lg' className='flex flex-col overflow-hidden'>
          <SheetHeader className='shrink-0 pr-8'>
            <div className='flex items-center gap-3'>
              <UserAvatar name={managing?.name ?? ''} className='size-10' />
              <div className='min-w-0'>
                <SheetTitle className='truncate'>
                  {managing ? managing.name : 'Manage user'}
                </SheetTitle>
                <SheetDescription className='truncate'>
                  {protectedAdmin
                    ? 'Managed by the ADMIN_* environment variables.'
                    : (managing?.email ?? 'Manage details and access.')}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {managing && (
            <ScrollArea className='min-h-0 flex-1'>
              <div className='space-y-6 px-4 pb-4 sm:px-6'>
                <section className='space-y-3'>
                  <div>
                    <p className='text-sm font-medium'>Details</p>
                    <p className='text-xs text-muted-foreground'>
                      Account information and sign-in.
                    </p>
                  </div>

                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor='admin-name'>Name</FieldLabel>
                      <Input
                        id='admin-name'
                        value={name}
                        disabled={protectedAdmin}
                        onChange={(event) => setName(event.target.value)}
                      />
                    </Field>

                    <Field>
                      <FieldLabel htmlFor='admin-email'>Email</FieldLabel>
                      <Input
                        id='admin-email'
                        type='email'
                        value={email}
                        disabled={protectedAdmin}
                        onChange={(event) => setEmail(event.target.value)}
                      />
                    </Field>

                    <Field orientation='horizontal' className='justify-between'>
                      <div>
                        <FieldLabel htmlFor='admin-active'>Active</FieldLabel>
                        <FieldDescription>Can sign in.</FieldDescription>
                      </div>
                      <Switch
                        id='admin-active'
                        checked={isActive}
                        disabled={protectedAdmin}
                        onCheckedChange={setIsActive}
                      />
                    </Field>

                    <Field orientation='horizontal' className='justify-between'>
                      <div>
                        <FieldLabel htmlFor='admin-admin'>
                          Administrator
                        </FieldLabel>
                        <FieldDescription>
                          Bypasses page and action grants.
                        </FieldDescription>
                      </div>
                      <Switch
                        id='admin-admin'
                        checked={isAdmin}
                        disabled={protectedAdmin}
                        onCheckedChange={setIsAdmin}
                      />
                    </Field>
                  </FieldGroup>
                </section>

                <FieldSeparator />

                <section className='space-y-5'>
                  <div>
                    <p className='text-sm font-medium'>Access</p>
                    <p className='text-xs text-muted-foreground'>
                      Pages and actions this user can reach.
                    </p>
                  </div>

                  {accessDisabled && (
                    <p className='rounded-lg border border-dashed p-3 text-xs text-muted-foreground'>
                      {protectedAdmin
                        ? 'Access editing is disabled for the environment admin.'
                        : 'Administrators bypass page and action grants.'}
                    </p>
                  )}

                  <div className='flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2'>
                    <p className='text-xs text-muted-foreground'>
                      {pages.size + 1} of {pageRows.length + 1} pages ·{' '}
                      {events.size} of {totalActions} actions
                    </p>
                    <div className='flex gap-1'>
                      <Button
                        type='button'
                        size='sm'
                        variant='ghost'
                        disabled={accessDisabled}
                        onClick={grantAll}
                      >
                        Grant all
                      </Button>
                      <Button
                        type='button'
                        size='sm'
                        variant='ghost'
                        disabled={accessDisabled}
                        onClick={clearAll}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>

                  <section className='space-y-2'>
                    <div className='flex flex-wrap items-baseline justify-between gap-1'>
                      <p className='text-sm font-medium'>Pages</p>
                      <p className='text-xs text-muted-foreground'>
                        Where the user can go.
                      </p>
                    </div>

                    <div className='grid gap-2 sm:grid-cols-2'>
                      <label className='flex items-center gap-3 rounded-lg bg-muted/50 p-3 ring-1 ring-foreground/10'>
                        <Checkbox
                          checked
                          disabled
                          aria-label='Dashboard access'
                        />
                        <span className='min-w-0'>
                          <span className='block text-sm font-medium'>
                            Dashboard
                          </span>
                          <span className='block text-xs text-muted-foreground'>
                            Always available
                          </span>
                        </span>
                      </label>

                      {pageRows.map((page) => (
                        <label
                          key={page.key}
                          className={cn(
                            'flex items-center gap-3 rounded-lg p-3 ring-1 ring-foreground/10',
                            accessDisabled
                              ? 'opacity-60'
                              : 'cursor-pointer hover:bg-muted/40',
                          )}
                        >
                          <Checkbox
                            checked={pages.has(page.key)}
                            disabled={accessDisabled}
                            onCheckedChange={(checked) =>
                              setPages((current) =>
                                setHas(current, page.key, checked === true),
                              )
                            }
                          />
                          <span className='min-w-0'>
                            <span className='block text-sm font-medium'>
                              {page.name}
                            </span>
                            <span className='block text-xs text-muted-foreground'>
                              {PAGE_DESCRIPTIONS[page.key] ?? 'Page access'}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </section>

                  <section className='space-y-3'>
                    <div className='flex flex-wrap items-baseline justify-between gap-1'>
                      <p className='text-sm font-medium'>Actions</p>
                      <p className='text-xs text-muted-foreground'>
                        What the user can do. Actions apply wherever they
                        appear.
                      </p>
                    </div>

                    {actionGroups.map((group) => {
                      const keys = group.events.map((event) => event.key)
                      const selected = keys.filter((key) =>
                        events.has(key),
                      ).length
                      const allSelected = selected === keys.length

                      return (
                        <div
                          key={group.key}
                          className='rounded-lg ring-1 ring-foreground/10'
                        >
                          <div className='flex items-center justify-between gap-2 bg-muted/50 px-3 py-2'>
                            <p className='text-sm font-medium'>
                              {group.name}
                              <span className='ml-2 text-xs font-normal text-muted-foreground'>
                                {selected} of {keys.length}
                              </span>
                            </p>
                            <Button
                              type='button'
                              size='sm'
                              variant='ghost'
                              disabled={accessDisabled}
                              onClick={() => toggleGroup(keys, !allSelected)}
                            >
                              {allSelected ? 'Clear' : 'Select all'}
                            </Button>
                          </div>

                          <div className='grid gap-x-4 gap-y-2 p-3 sm:grid-cols-2'>
                            {group.events.map((event) => (
                              <label
                                key={event.key}
                                className={cn(
                                  'flex items-start gap-2',
                                  accessDisabled
                                    ? 'opacity-60'
                                    : 'cursor-pointer',
                                )}
                              >
                                <Checkbox
                                  className='mt-0.5'
                                  checked={events.has(event.key)}
                                  disabled={accessDisabled}
                                  onCheckedChange={(checked) =>
                                    setEvents((current) =>
                                      setHas(
                                        current,
                                        event.key,
                                        checked === true,
                                      ),
                                    )
                                  }
                                />
                                <span className='min-w-0'>
                                  <span className='block text-sm'>
                                    {event.name}
                                  </span>
                                  <span className='block text-xs text-muted-foreground'>
                                    {event.scope}
                                  </span>
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </section>
                </section>
              </div>
            </ScrollArea>
          )}

          <SheetFooter className='flex-row items-center gap-2'>
            <p className='mr-auto text-xs text-muted-foreground'>
              {isDirty ? 'Unsaved changes' : ''}
            </p>
            <Button
              type='button'
              variant='outline'
              disabled={isSaving}
              onClick={closeSheet}
            >
              Cancel
            </Button>
            <Button
              type='button'
              disabled={isSaving || protectedAdmin || !isDirty}
              onClick={() => void save()}
            >
              Save
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
