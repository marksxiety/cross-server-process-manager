import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './index.css'
import { App } from './App.tsx'
import { Toaster } from '@/components/ui/toast'
import { Dashboard } from './pages/Dashboard.tsx'
import { Template } from './pages/Template.tsx'
import { Server } from './pages/Server.tsx'
import { Process } from './pages/Process.tsx'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'template', element: <Template /> },
      { path: 'server', element: <Server /> },
      { path: 'process', element: <Process /> },
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