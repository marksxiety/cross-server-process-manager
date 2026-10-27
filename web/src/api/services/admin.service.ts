import { registryConnection } from '@/api/registry'
import type { ApiResponse } from '@/types/api'
import type {
  AdminAccessUpdate,
  AdminCatalog,
  AdminUser,
  AdminUserUpdate,
} from '@/types/admin'

function unreachable<T>(cause: unknown): ApiResponse<T> {
  return {
    success: false,
    message: cause instanceof Error ? cause.message : String(cause),
    info: null,
    status: 0,
  }
}

export function adminService() {
  const api = registryConnection()

  return {
    listUsers: async (): Promise<ApiResponse<AdminUser[]>> => {
      try {
        return await api.get<AdminUser[]>('/admin/users')
      } catch (cause) {
        return unreachable(cause)
      }
    },

    catalog: async (): Promise<ApiResponse<AdminCatalog>> => {
      try {
        return await api.get<AdminCatalog>('/admin/catalog')
      } catch (cause) {
        return unreachable(cause)
      }
    },

    updateUser: async (
      id: number,
      data: AdminUserUpdate
    ): Promise<ApiResponse<AdminUser>> => {
      try {
        return await api.put<AdminUser>(`/admin/users/${id}`, data)
      } catch (cause) {
        return unreachable(cause)
      }
    },

    updateAccess: async (
      id: number,
      data: AdminAccessUpdate
    ): Promise<ApiResponse<AdminUser>> => {
      try {
        return await api.put<AdminUser>(`/admin/users/${id}/access`, data)
      } catch (cause) {
        return unreachable(cause)
      }
    },
  }
}
