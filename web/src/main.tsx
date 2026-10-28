import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './index.css'
import { App } from './App.tsx'
import { Toaster } from '@/components/ui/toast'
import { Dashboard } from './pages/Dashboard.tsx'
import { ErrorPage } from './pages/ErrorPage.tsx'
import { Template } from './pages/Template.tsx'
import { Server } from './pages/Server.tsx'
import { Process } from './pages/Process.tsx'
import { ServerMetricsRoute } from './pages/ServerMetricsRoute.tsx'
import { Login } from './pages/auth/login.tsx'
import { Register } from './pages/auth/register.tsx'
import { VerifyEmail } from './pages/auth/verify-email.tsx'
import { ForgotPassword } from './pages/auth/forgot-password.tsx'
import { ResetPassword } from './pages/auth/reset-password.tsx'
import { Forbidden } from './pages/Forbidden.tsx'
import { AdminPanel } from './pages/admin/AdminPanel.tsx'
import { AuditLogPage } from './pages/admin/Audit.tsx'
import {
  redirectIfAuthenticated,
  requireAdmin,
  requirePage,
  requireSession,
} from './auth/require-session.ts'
import { SessionHydrateFallback } from './components/auth/session-hydrate-fallback.tsx'
import { AuthRoot } from './components/auth/auth-root.tsx'

const router = createBrowserRouter([
  {
    element: <AuthRoot />,
    errorElement: <ErrorPage />,
    children: [
      { path: 'login', element: <Login />, loader: redirectIfAuthenticated },
      { path: 'register', element: <Register />, loader: redirectIfAuthenticated },
      {
        path: 'verify-email',
        element: <VerifyEmail />,
        loader: redirectIfAuthenticated,
      },
      {
        path: 'forgot-password',
        element: <ForgotPassword />,
        loader: redirectIfAuthenticated,
      },
      {
        path: 'reset-password',
        element: <ResetPassword />,
        loader: redirectIfAuthenticated,
      },
      { path: 'forbidden', element: <Forbidden /> },
      {
        path: '/',
        element: <App />,
        loader: requireSession,
        HydrateFallback: SessionHydrateFallback,
        shouldRevalidate: () => false,
        children: [
          { index: true, element: <Dashboard /> },
          {
            path: 'server/:serverName/metrics',
            element: <ServerMetricsRoute />,
            loader: requirePage('server_metrics'),
          },
          {
            path: 'template',
            element: <Template />,
            loader: requirePage('templates'),
          },
          { path: 'server', element: <Server />, loader: requirePage('servers') },
          { path: 'process', element: <Process />, loader: requirePage('process') },
          {
            path: 'admin',
            element: <AdminPanel />,
            loader: requireAdmin,
          },
          {
            path: 'admin/audit',
            element: <AuditLogPage />,
            loader: requireAdmin,
          },
        ],
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