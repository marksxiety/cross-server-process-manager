import { NavLink, useLocation } from 'react-router'
import { Cog, FileText, LayoutDashboard, Server } from 'lucide-react'
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

const navItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Process', url: '/process', icon: Cog },
  { title: 'Templates', url: '/template', icon: FileText },
  { title: 'Servers', url: '/server', icon: Server },
]

export function AppSidebar() {
  const { pathname } = useLocation()
  const { state, isMobile } = useSidebar()

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
            {navItems.map((item) => (
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

      <SidebarFooter className='items-center'>
        <Badge
          variant='secondary'
          className='w-fit font-mono font-normal normal-case tracking-wider text-muted-foreground/70 group-data-[collapsible=icon]:hidden'
        >
          v{__APP_VERSION__}
        </Badge>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
