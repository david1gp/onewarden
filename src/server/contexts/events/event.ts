export type Event = {
  uuid: string
  eventType: number
  userUuid: string | null
  organizationUuid: string | null
  cipherUuid: string | null
  collectionUuid: string | null
  groupUuid: string | null
  organizationUserUuid: string | null
  actingUserUuid: string | null
  deviceType: number | null
  ipAddress: string | null
  eventDate: string
  policyUuid: string | null
  providerUuid: string | null
  providerUserUuid: string | null
  providerOrganizationUuid: string | null
}
