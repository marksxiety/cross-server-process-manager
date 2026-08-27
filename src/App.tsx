import { Outlet } from 'react-router'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/custom/AppSidebar'

export function App() {
  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar />
      {/* Ensure SidebarInset is constrained and does not cause page-level scroll */}
      <SidebarInset className="flex h-full flex-col overflow-hidden">
        {/* Fixed Header */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
          </div>
        </header>

        {/* Scrollable Page Content */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-muted/30">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}