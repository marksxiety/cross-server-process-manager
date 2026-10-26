export interface AuthUser {
  id: number
  email: string
  name: string
  role: string
  is_active: boolean
  email_verified_at: string | null
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export interface AuthSessionPayload {
  token: string
  token_type: 'Bearer'
  expires_in: number
  user: AuthUser
}

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  email: string
  name: string
  password: string
}
