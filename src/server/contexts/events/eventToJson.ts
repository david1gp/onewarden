import type { Event } from "./event.js"

export function eventToJson(event: Event) {
  return {
    type: event.eventType,
    userId: event.userUuid,
    organizationId: event.organizationUuid,
    cipherId: event.cipherUuid,
    collectionId: event.collectionUuid,
    groupId: event.groupUuid,
    organizationUserId: event.organizationUserUuid,
    actingUserId: event.actingUserUuid,
    date: eventDateToJson(event.eventDate),
    deviceType: event.deviceType,
    ipAddress: event.ipAddress,
    policyId: event.policyUuid,
    providerId: event.providerUuid,
    providerUserId: event.providerUserUuid,
    providerOrganizationId: event.providerOrganizationUuid,
  }
}

function eventDateToJson(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toISOString()
}
