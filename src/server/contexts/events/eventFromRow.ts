import type { Event } from "./event.js"
import type { EventRow } from "../../database/schema/event.js"

export function eventFromRow(row: EventRow): Event {
  return {
    uuid: row.uuid,
    eventType: row.eventType,
    userUuid: row.userUuid,
    organizationUuid: row.orgUuid,
    cipherUuid: row.cipherUuid,
    collectionUuid: row.collectionUuid,
    groupUuid: row.groupUuid,
    organizationUserUuid: row.orgUserUuid,
    actingUserUuid: row.actUserUuid,
    deviceType: row.deviceType,
    ipAddress: row.ipAddress,
    eventDate: row.eventDate,
    policyUuid: row.policyUuid,
    providerUuid: row.providerUuid,
    providerUserUuid: row.providerUserUuid,
    providerOrganizationUuid: row.providerOrgUuid,
  }
}
