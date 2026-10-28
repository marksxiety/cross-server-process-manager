import { NavLink, useLocation } from 'react-router'
import {
  Cog,
  FileText,
  History,
  LayoutDashboard,
  Server,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'
import xpmIcon from '@/assets/xpm-icon.svg'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { SidebarUserMenu } from '@/components/auth/sidebar-user-menu'
import { useAccess } from '@/hooks/use-access'
import type { PageKey } from '@/lib/access-catalog'

type NavItem = {
  title: string
  url: string
  icon: LucideIcon
  page?: PageKey
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard, page: 'dashboard' },
  { title: 'Process', url: '/process', icon: Cog, page: 'process' },
  { title: 'Templates', url: '/template', icon: FileText, page: 'templates' },
  { title: 'Servers', url: '/server', icon: Server, page: 'servers' },
  {
    title: 'Admin',
    url: '/admin',
    icon: ShieldCheck,
    adminOnly: true,
  },
  {
    title: 'Audit',
    url: '/admin/audit',
    icon: History,
    adminOnly: true,
  },
]

export function AppSidebar() {
  const { pathname } = useLocation()
  const { state, isMobile } = useSidebar()
  const access = useAccess()
  const visibleNavItems = navItems.filter((item) =>
    item.adminOnly ? access.isAdmin : item.page !== undefined && access.canVisit(item.page)
  )

  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <Tooltip>
              <TooltipTrigger
                render={
                  <SidebarMenuButton size='lg' className='cursor-default'>
                    <img
                      src={xpmIcon}
                      alt='XPM logo'
                      className='size-8 shrink-0 rounded-lg border border-sidebar-border'
                    />
                    <div className='grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden'>
                      <span className='truncate text-sm font-semibold tracking-tight'>
                        XPM
                      </span>
                      <span className='text-xs text-muted-foreground text-wrap'>
                        Cross-Server Process Manager
                      </span>
                    </div>
                  </SidebarMenuButton>
                }
              />
              <TooltipContent
                side='right'
                align='start'
                hidden={state !== 'collapsed' || isMobile}
              >
                XPM · Cross-Server Process Manager
              </TooltipContent>
            </Tooltip>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>General</SidebarGroupLabel>
          <SidebarMenu>
            {visibleNavItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  render={
                    <NavLink
                      to={item.url}
                      className='flex items-center gap-2 w-full'
                    />
                  }
                  isActive={pathname === item.url}
                  tooltip={item.title}
                >
                  <item.icon strokeWidth={2} className='size-4 shrink-0' />
                  <span className='group-data-[collapsible=icon]:hidden'>
                    {item.title}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className='items-center gap-2'>
        <Badge
          variant='secondary'
          className='w-fit font-mono font-normal normal-case tracking-wider text-muted-foreground/70 group-data-[collapsible=icon]:hidden'
        >
          v{__APP_VERSION__}
        </Badge>
        <SidebarUserMenu />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
