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
import {
  redirectIfAuthenticated,
  requireMember,
  requireSession,
} from './auth/require-session.ts'

const router = createBrowserRouter([
  {
    errorElement: <ErrorPage />,
    children: [
      { path: 'login', element: <Login />, loader: redirectIfAuthenticated },
      { path: 'register', element: <Register />, loader: redirectIfAuthenticated },
      { path: 'verify-email', element: <VerifyEmail /> },
      { path: 'forgot-password', element: <ForgotPassword /> },
      { path: 'reset-password', element: <ResetPassword /> },
      { path: 'forbidden', element: <Forbidden /> },
    ],
  },
  {
    path: '/',
    element: <App />,
    errorElement: <ErrorPage />,
    loader: requireSession,
    shouldRevalidate: () => false,
    children: [
      { index: true, element: <Dashboard /> },
      {
        path: 'server/:serverName/metrics',
        element: <ServerMetricsRoute />,
      },
      {
        loader: requireMember,
        children: [
          { path: 'template', element: <Template /> },
          { path: 'server', element: <Server /> },
          { path: 'process', element: <Process /> },
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