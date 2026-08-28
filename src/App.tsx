import { Outlet } from 'react-router'
import {
  FullScreenIcon,
  ArrowShrink02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/custom/AppSidebar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useFullscreen } from '@/hooks/use-fullscreen'

export function App() {
  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <AppLayout />
    </SidebarProvider>
  )
}

function AppLayout() {
  const { isFullscreen, toggleFullscreen } = useFullscreen()
  const { setOpenMobile } = useSidebar()

  const handleToggleFullscreen = () => {
    if (!isFullscreen) setOpenMobile(false)
    void toggleFullscreen()
  }

  return (
    <>
      {!isFullscreen && <AppSidebar />}
      {/* Ensure SidebarInset is constrained and does not cause page-level scroll */}
      <SidebarInset className="flex h-full flex-col overflow-hidden">
        {/* Fixed Header */}
        <header
          className={cn(
            'flex h-16 shrink-0 items-center justify-between border-b px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12',
            isFullscreen && 'hidden',
          )}
        >
          <div className="flex items-center gap-2">
            <SidebarTrigger />
          </div>

          {/* Fullscreen Trigger */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => void handleToggleFullscreen()}
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              <HugeiconsIcon
                icon={isFullscreen ? ArrowShrink02Icon : FullScreenIcon}
                size={18}
                strokeWidth={2}
              />
            </Button>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-muted/30">
          <Outlet />
        </div>
      </SidebarInset>
    </>
  )
}