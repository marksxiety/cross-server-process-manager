import { NavLink, useLocation } from 'react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  DashboardSquareSettingIcon,
  FormIcon,
  ArtificialIntelligence07Icon,
  ChartRelationshipIcon,
} from '@hugeicons/core-free-icons'
import {
  Sidebar,
  SidebarContent,
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

const navItems = [
  { title: 'Dashboard', url: '/', icon: DashboardSquareSettingIcon },
  { title: 'Templates', url: '/template', icon: FormIcon },
  { title: 'Process', url: '/process', icon: ArtificialIntelligence07Icon },
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
                    <div className='relative flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground'>
                      <HugeiconsIcon
                        icon={ChartRelationshipIcon}
                        strokeWidth={2}
                        className='size-4'
                      />
                    </div>
                    <div className='grid flex-1 text-left leading-tight'>
                      <span className='truncate text-sm font-semibold tracking-tight'>
                        XPM
                      </span>
                      <span className='truncate text-xs text-muted-foreground'>
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
                  <HugeiconsIcon
                    icon={item.icon}
                    strokeWidth={2}
                    className='size-4 shrink-0'
                  />
                  <span className='group-data-[collapsible=icon]:hidden'>
                    {item.title}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}
