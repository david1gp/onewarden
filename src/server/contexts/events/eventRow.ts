export type EventRow = {
  uuid: string
  event_type: number
  user_uuid: string | null
  org_uuid: string | null
  cipher_uuid: string | null
  collection_uuid: string | null
  group_uuid: string | null
  org_user_uuid: string | null
  act_user_uuid: string | null
  device_type: number | null
  ip_address: string | null
  event_date: string
  policy_uuid: string | null
  provider_uuid: string | null
  provider_user_uuid: string | null
  provider_org_uuid: string | null
}
