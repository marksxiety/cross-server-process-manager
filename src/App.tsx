import { Outlet } from 'react-router'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/custom/AppSidebar'

export function App() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Fixed Header Layout */}
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
          </div>
        </header>

        {/* Page Content */}
        <div className="flex flex-1 flex-col gap-4 p-4 bg-muted/30">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}