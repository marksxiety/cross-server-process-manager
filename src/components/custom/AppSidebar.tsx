import { NavLink, useLocation } from 'react-router'
import { Bot, ChevronRight, Cog, FileText, LayoutDashboard, Server } from 'lucide-react'
import xpmIcon from '@/assets/xpm-icon.svg'
import { version } from '../../../package.json'
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'

const navItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Templates', url: '/template', icon: FileText },
]

const registerItems = [
  { title: 'Server', url: '/server', icon: Server },
  { title: 'Process', url: '/process', icon: Cog },
]

export function AppSidebar() {
  const { pathname } = useLocation()
  const { state, isMobile } = useSidebar()
  const isRegisterActive = registerItems.some((item) => item.url === pathname)

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

            <SidebarMenuItem>
              <Collapsible defaultOpen={isRegisterActive}>
                <CollapsibleTrigger
                  render={
                    <SidebarMenuButton
                      tooltip='Register'
                      className='group/collapsible'
                    >
                      <Bot strokeWidth={2} className='size-4 shrink-0' />
                      <span className='group-data-[collapsible=icon]:hidden'>
                        Register
                      </span>
                      <ChevronRight
                        strokeWidth={2}
                        className='ml-auto size-4 shrink-0 transition-transform group-data-[collapsible=icon]:hidden group-aria-expanded/collapsible:rotate-90'
                      />
                    </SidebarMenuButton>
                  }
                />
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {registerItems.map((item) => (
                      <SidebarMenuSubItem key={item.title}>
                        <SidebarMenuSubButton
                          render={
                            <NavLink
                              to={item.url}
                              className='flex items-center gap-2 w-full'
                            />
                          }
                          isActive={pathname === item.url}
                        >
                          <item.icon strokeWidth={2} className='size-4 shrink-0' />
                          <span>{item.title}</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </Collapsible>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className='items-center'>
        <Badge
          variant='secondary'
          className='w-fit font-mono font-normal normal-case tracking-wider text-muted-foreground/70 group-data-[collapsible=icon]:hidden'
        >
          v{version}
        </Badge>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
