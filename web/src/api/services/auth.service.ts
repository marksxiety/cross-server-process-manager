import { anonymousRegistryConnection, registryConnection } from '@/api/registry'
import type { ApiResponse } from '@/types/api'
import type {
  AuthSessionPayload,
  AuthUser,
  LoginInput,
  RegisterInput,
  RegisterResult,
  ResetPasswordInput,
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

    register: async (input: RegisterInput): Promise<ApiResponse<RegisterResult>> => {
      try {
        return await anonymousRegistryConnection().post<RegisterResult>('/auth/register', input)
      } catch (cause) {
        return unreachable(cause)
      }
    },

    verifyEmail: async (token: string, password: string): Promise<ApiResponse<null>> => {
      try {
        return await anonymousRegistryConnection().post<null>('/auth/verify-email', {
          token,
          password,
        })
      } catch (cause) {
        return unreachable(cause)
      }
    },

    resendVerification: async (email: string): Promise<ApiResponse<null>> => {
      try {
        return await anonymousRegistryConnection().post<null>('/auth/verify-email/request', {
          email,
        })
      } catch (cause) {
        return unreachable(cause)
      }
    },

    forgotPassword: async (email: string): Promise<ApiResponse<null>> => {
      try {
        return await anonymousRegistryConnection().post<null>('/auth/forgot-password', { email })
      } catch (cause) {
        return unreachable(cause)
      }
    },

    resetPassword: async (input: ResetPasswordInput): Promise<ApiResponse<null>> => {
      try {
        return await anonymousRegistryConnection().post<null>('/auth/reset-password', input)
      } catch (cause) {
        return unreachable(cause)
      }
    },

    logout: async (): Promise<ApiResponse<null>> => {
      try {
        return await registryConnection().post<null>('/auth/logout')
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
