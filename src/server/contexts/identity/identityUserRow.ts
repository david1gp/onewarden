export type IdentityUserRow = {
  uuid: string
  enabled: number
  created_at: string
  updated_at: string
  verified_at: string | null
  last_verifying_at: string | null
  login_verify_count: number
  email: string
  email_new: string | null
  email_new_token: string | null
  name: string
  password_hash: Uint8Array
  salt: Uint8Array
  password_iterations: number
  password_hint: string | null
  akey: string
  private_key: string | null
  public_key: string | null
  security_stamp: string
  stamp_exception: string | null
  equivalent_domains: string
  excluded_globals: string
  client_kdf_type: number
  client_kdf_iter: number
  client_kdf_memory: number | null
  client_kdf_parallelism: number | null
  api_key: string | null
  avatar_color: string | null
  external_id: string | null
}
