import { Outlet, useMatches } from 'react-router'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/custom/AppSidebar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import React from 'react'

export function App() {
  const matches = useMatches()
  
  // Extract breadcrumbs from route handle definitions or default to path segments
  const breadcrumbs = matches
    .filter((match) => Boolean((match.handle as { breadcrumb?: string })?.breadcrumb))
    .map((match) => ({
      title: (match.handle as { breadcrumb: string }).breadcrumb,
      pathname: match.pathname,
    }))

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Fixed Header Layout */}
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((crumb, index) => {
                  const isLast = index === breadcrumbs.length - 1
                  return (
                    <React.Fragment key={crumb.pathname}>
                      <BreadcrumbItem className={!isLast ? "hidden md:block" : ""}>
                        {isLast ? (
                          <BreadcrumbPage>{crumb.title}</BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink href={crumb.pathname}>
                            {crumb.title}
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                      {!isLast && (
                        <BreadcrumbSeparator className="hidden md:block" />
                      )}
                    </React.Fragment>
                  )
                })}
              </BreadcrumbList>
            </Breadcrumb>
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