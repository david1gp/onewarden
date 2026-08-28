export type EmergencyAccessRow = {
  uuid: string
  grantor_uuid: string
  grantee_uuid: string | null
  email: string | null
  key_encrypted: string | null
  atype: number
  status: number
  wait_time_days: number
  recovery_initiated_at: string | null
  last_notification_at: string | null
  updated_at: string
  created_at: string
}
