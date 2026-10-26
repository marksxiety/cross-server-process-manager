import { anonymousRegistryConnection, registryConnection } from '@/api/registry'
import type { ApiResponse } from '@/types/api'
import type {
  AuthSessionPayload,
  AuthUser,
  LoginInput,
  RegisterInput,
} from '@/types/auth'

function unreachable<T>(cause: unknown): ApiResponse<T> {
  return {
    success: false,
    message: cause instanceof Error ? cause.message : String(cause),
    info: null,
    status: 0,
  }
}

export function authService() {
  return {
    login: async (input: LoginInput): Promise<ApiResponse<AuthSessionPayload>> => {
      try {
        return await anonymousRegistryConnection().post<AuthSessionPayload>('/auth/login', input)
      } catch (cause) {
        return unreachable(cause)
      }
    },

    register: async (input: RegisterInput): Promise<ApiResponse<AuthSessionPayload>> => {
      try {
        return await anonymousRegistryConnection().post<AuthSessionPayload>('/auth/register', input)
      } catch (cause) {
        return unreachable(cause)
      }
    },

    me: async (): Promise<ApiResponse<AuthUser>> => {
      try {
        return await registryConnection().get<AuthUser>('/auth/me')
      } catch (cause) {
        return unreachable(cause)
      }
    },
  }
}
