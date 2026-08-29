export type IdentitySsoAuthRow = {
  state: string
  client_challenge: string
  nonce: string
  redirect_uri: string
  code_response: string | null
  code_response_error: string | null
  auth_response: string | null
  created_at: string
  updated_at: string
  binding_hash: string | null
  organization_uuid?: string | null
}
