export type IdentityAuthRequestRow = {
  uuid: string
  user_uuid: string
  organization_uuid: string | null
  request_device_identifier: string
  device_type: number
  request_ip: string
  response_device_id: string | null
  access_code: string
  public_key: string
  enc_key: string | null
  master_password_hash: string | null
  approved: number | null
  creation_date: string
  response_date: string | null
  authentication_date: string | null
}
