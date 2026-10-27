export interface AdminUser {
  id: number
  email: string
  name: string
  is_active: boolean
  is_admin: boolean
  is_env_admin: boolean
  email_verified_at: string | null
  last_login_at: string | null
  created_at: string
  updated_at: string
  pages: string[]
  events: string[]
}

export interface AdminCatalogEvent {
  key: string
  name: string
}

export interface AdminCatalogPage {
  key: string
  name: string
  events: AdminCatalogEvent[]
}

export interface AdminCatalog {
  implicit_page: string
  guest_pages: string[]
  default_pages: string[]
  default_events: string[]
  pages: AdminCatalogPage[]
  events: AdminCatalogEvent[]
}

export interface AdminUserUpdate {
  name?: string
  email?: string
  is_active?: boolean
  is_admin?: boolean
}

export interface AdminAccessUpdate {
  pages: string[]
  events: string[]
}
