import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './index.css'
import { App } from './App.tsx'
import { Dashboard } from './pages/Dashboard.tsx'
import { Template } from './pages/Template.tsx'
import { Server } from './pages/Server.tsx'
import { Process } from './pages/Process.tsx'
import type { PageHandle } from '@/types/page'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Dashboard /> },
      {
        path: 'template',
        element: <Template />,
        handle: {
          title: 'Template',
          description: 'Manage process templates.',
        } satisfies PageHandle,
      },
      {
        path: 'server',
        element: <Server />,
        handle: {
          title: 'Servers',
          description: "Manage the fleet's registered servers.",
        } satisfies PageHandle,
      },
      {
        path: 'process',
        element: <Process />,
        handle: {
          title: 'Register process',
          description: 'Register a new process to monitor.',
        } satisfies PageHandle,
      },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)