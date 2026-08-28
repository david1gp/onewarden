export type IdentityDeviceRow = {
  uuid: string
  created_at: string
  updated_at: string
  user_uuid: string
  name: string
  atype: number
  push_uuid: string | null
  push_token: string | null
  refresh_token: string
  twofactor_remember: string | null
}
