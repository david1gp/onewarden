export type CipherRow = {
  uuid: string
  created_at: string
  updated_at: string
  user_uuid: string | null
  organization_uuid: string | null
  key: string | null
  atype: number
  name: string
  notes: string | null
  fields: string | null
  data: string
  password_history: string | null
  deleted_at: string | null
  reprompt: number | null
}
