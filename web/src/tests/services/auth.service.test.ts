import { beforeEach, describe, expect, test, vi } from 'vitest'

vi.mock('@/api/registry', () => ({
  anonymousRegistryConnection: vi.fn(),
  registryConnection: vi.fn(),
}))

import type { Connection } from '@/api/connection'
import { anonymousRegistryConnection, registryConnection } from '@/api/registry'
import { authService } from '@/api/services/auth.service'
import type { AuthSessionPayload, AuthUser } from '@/types/auth'

const USER: AuthUser = {
  id: 1,
  email: 'admin@example.com',
  name: 'Admin',
  role: 'viewer',
  is_active: true,
  email_verified_at: null,
  last_login_at: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

const PAYLOAD: AuthSessionPayload = {
  token: 'jwt-token',
  token_type: 'Bearer',
  expires_in: 60,
  user: USER,
}

function connectionWith(overrides: Partial<Connection>): Connection {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
    ...overrides,
  } as Connection
}

beforeEach(() => {
  vi.mocked(anonymousRegistryConnection).mockReset()
  vi.mocked(registryConnection).mockReset()
})

describe('authService', () => {
  test('posts login credentials to the public registry endpoint', async () => {
    const post = vi.fn().mockResolvedValue({
      success: true,
      message: 'Login successful',
      info: PAYLOAD,
      status: 200,
    })
    vi.mocked(anonymousRegistryConnection).mockReturnValue(connectionWith({ post }))
    const input = { email: 'admin@example.com', password: 'secret-password' }

    const result = await authService().login(input)

    expect(post).toHaveBeenCalledWith('/auth/login', input)
    expect(vi.mocked(registryConnection)).not.toHaveBeenCalled()
    expect(result.info).toEqual(PAYLOAD)
  })

  test('posts registration details to the public registry endpoint', async () => {
    const post = vi.fn().mockResolvedValue({
      success: true,
      message: 'Registration successful',
      info: PAYLOAD,
      status: 200,
    })
    vi.mocked(anonymousRegistryConnection).mockReturnValue(connectionWith({ post }))
    const input = {
      email: 'admin@example.com',
      name: 'Admin',
      password: 'secret-password',
    }

    await authService().register(input)

    expect(post).toHaveBeenCalledWith('/auth/register', input)
    expect(vi.mocked(registryConnection)).not.toHaveBeenCalled()
  })

  test('loads the current user through the authenticated registry connection', async () => {
    const get = vi.fn().mockResolvedValue({
      success: true,
      message: 'Authenticated user retrieved',
      info: USER,
      status: 200,
    })
    vi.mocked(registryConnection).mockReturnValue(connectionWith({ get }))

    const result = await authService().me()

    expect(get).toHaveBeenCalledWith('/auth/me')
    expect(vi.mocked(anonymousRegistryConnection)).not.toHaveBeenCalled()
    expect(result.info).toEqual(USER)
  })

  test('turns a network failure into an unreachable envelope', async () => {
    const post = vi.fn().mockRejectedValue(new Error('fetch failed'))
    vi.mocked(anonymousRegistryConnection).mockReturnValue(connectionWith({ post }))

    const result = await authService().login({
      email: 'admin@example.com',
      password: 'secret-password',
    })

    expect(result).toEqual({
      success: false,
      message: 'fetch failed',
      info: null,
      status: 0,
    })
  })
})
