import { NavLink, useLocation } from 'react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  DashboardSquare01Icon,
  LayoutGridIcon,
  PackageProcessIcon,
  ShuffleIcon,
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
} from '@/components/ui/sidebar'

const navItems = [
  { title: 'Dashboard', url: '/', icon: DashboardSquare01Icon },
  { title: 'Template', url: '/template', icon: LayoutGridIcon },
  { title: 'Process', url: '/process', icon: PackageProcessIcon },
]

export function AppSidebar() {
  const { pathname } = useLocation()

  return (
    <Sidebar collapsible='icon'>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size='lg' className='cursor-default hover:bg-transparent active:bg-transparent'>
              <div className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground'>
                <HugeiconsIcon
                  icon={ShuffleIcon}
                  strokeWidth={2}
                  className='size-4'
                />
              </div>
              <div className='grid flex-1 text-left leading-tight'>
                <span className='truncate text-md font-semibold tracking-tight'>
                  XPM
                </span>
                <span className='truncate text-xs text-muted-foreground'>
                  Cross-Server Process Manager
                </span>
              </div>
            </SidebarMenuButton>
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
