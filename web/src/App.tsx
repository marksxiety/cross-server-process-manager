import { Outlet, useLocation } from 'react-router'
import { Maximize, Minimize2 } from 'lucide-react'
import { SidebarInset, SidebarProvider, SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/custom/AppSidebar'
import { SessionExpiredDialog } from '@/components/auth/session-expired-dialog'
import { SignedOutDialog } from '@/components/auth/signed-out-dialog'
import { ThemeToggle } from '@/components/custom/ThemeToggle'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useFullscreen } from '@/hooks/use-fullscreen'
import { useSessionRefresh } from '@/hooks/use-session-refresh'
import { ScrollArea } from '@/components/ui/scroll-area'

export function App() {
  useSessionRefresh()

  return (
    <SidebarProvider className="h-dvh overflow-hidden">
      <AppLayout />
      <SessionExpiredDialog />
      <SignedOutDialog />
    </SidebarProvider>
  )
}

function AppLayout() {
  const { isFullscreen, toggleFullscreen } = useFullscreen()
  const { setOpenMobile } = useSidebar()
  const { pathname } = useLocation()
  const isDashboard = pathname === '/'
  const showFullscreenToggle = isDashboard

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
            'flex h-14 shrink-0 items-center justify-between border-b px-3 transition-[width,height] ease-linear sm:h-16 sm:px-4 lg:px-6 group-has-data-[collapsible=icon]/sidebar-wrapper:h-12',
            isFullscreen && 'hidden',
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger />
          </div>

          {/* Theme & Fullscreen Triggers */}
          <div className='flex shrink-0 items-center gap-1 sm:gap-2'>
            <ThemeToggle />
            {showFullscreenToggle && (
              <Button
                variant="ghost"
                size="icon"
                className="size-10 text-muted-foreground hover:text-foreground lg:size-8"
                onClick={() => void handleToggleFullscreen()}
                title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              >
                {isFullscreen ? (
                  <Minimize2 size={18} strokeWidth={2} />
                ) : (
                  <Maximize size={18} strokeWidth={2} />
                )}
              </Button>
            )}
          </div>
        </header>

        {/* Scrollable Page Content */}
        <div className="min-h-0 flex-1 overflow-hidden bg-muted/30">
          <ScrollArea className="h-full">
            <div
              className={cn(
                'flex min-h-full w-full min-w-0 flex-col px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6',
                !isDashboard && 'mx-auto max-w-7xl',
              )}
            >
              <div className="min-w-0 flex-1">
                <Outlet />
              </div>
            </div>
          </ScrollArea>
        </div>
      </SidebarInset>
    </>
  )
}