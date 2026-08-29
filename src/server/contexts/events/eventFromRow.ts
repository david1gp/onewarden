import type { Event } from "./event.js"
import type { EventRow } from "./eventRow.js"

export function eventFromRow(row: EventRow): Event {
  return {
    uuid: row.uuid,
    eventType: row.event_type,
    userUuid: row.user_uuid,
    organizationUuid: row.org_uuid,
    cipherUuid: row.cipher_uuid,
    collectionUuid: row.collection_uuid,
    groupUuid: row.group_uuid,
    organizationUserUuid: row.org_user_uuid,
    actingUserUuid: row.act_user_uuid,
    deviceType: row.device_type,
    ipAddress: row.ip_address,
    eventDate: row.event_date,
    policyUuid: row.policy_uuid,
    providerUuid: row.provider_uuid,
    providerUserUuid: row.provider_user_uuid,
    providerOrganizationUuid: row.provider_org_uuid,
  }
}
