export type SendRow = {
  uuid: string
  user_uuid: string | null
  organization_uuid: string | null
  name: string
  notes: string | null
  atype: number
  data: string
  key: string
  password_hash: Uint8Array | null
  password_salt: Uint8Array | null
  password_iter: number | null
  max_access_count: number | null
  access_count: number
  creation_date: string
  revision_date: string
  expiration_date: string | null
  deletion_date: string
  disabled: number
  hide_email: number | null
  emails: string | null
}
