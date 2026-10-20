import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './index.css'
import { App } from './App.tsx'
import { Spinner } from '@/components/ui/spinner'
import { Toaster } from '@/components/ui/toast'
import { Dashboard } from './pages/Dashboard.tsx'
import { ErrorPage } from './pages/ErrorPage.tsx'
import { Template } from './pages/Template.tsx'
import { Server } from './pages/Server.tsx'
import { Process } from './pages/Process.tsx'
import { ServerMetricsRoute } from './pages/ServerMetricsRoute.tsx'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'template', element: <Template /> },
      { path: 'server', element: <Server /> },
      { path: 'process', element: <Process /> },
      {
        path: 'server/:serverName/metrics',
        element: (
          <Suspense
            fallback={
              <div className='flex items-center gap-2 py-10 text-sm text-muted-foreground'>
                <Spinner className='size-4' />
                Loading metrics…
              </div>
            }
          >
            <ServerMetricsRoute />
          </Suspense>
        ),
      },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Toaster>
      <RouterProvider router={router} />
    </Toaster>
  </StrictMode>,
)