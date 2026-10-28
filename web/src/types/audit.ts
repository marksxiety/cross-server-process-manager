export interface AuditEntry {
  id: number
  user_id: number | null
  category: string
  action: string
  details: string | null
  ip_address: string | null
  created_at: string
  user_name: string | null
  user_email: string | null
}
