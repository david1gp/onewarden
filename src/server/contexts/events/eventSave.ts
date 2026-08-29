import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { Event } from "./event.js"

export function eventSave(database: DatabaseConnection, event: Event): Result<void> {
  const op = "eventSave"
  try {
    database.run(
      `INSERT INTO event (
        uuid, event_type, user_uuid, org_uuid, cipher_uuid, collection_uuid,
        group_uuid, org_user_uuid, act_user_uuid, device_type, ip_address,
        event_date, policy_uuid, provider_uuid, provider_user_uuid, provider_org_uuid
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(uuid) DO UPDATE SET
        event_type = excluded.event_type,
        user_uuid = excluded.user_uuid,
        org_uuid = excluded.org_uuid,
        cipher_uuid = excluded.cipher_uuid,
        collection_uuid = excluded.collection_uuid,
        group_uuid = excluded.group_uuid,
        org_user_uuid = excluded.org_user_uuid,
        act_user_uuid = excluded.act_user_uuid,
        device_type = excluded.device_type,
        ip_address = excluded.ip_address,
        event_date = excluded.event_date,
        policy_uuid = excluded.policy_uuid,
        provider_uuid = excluded.provider_uuid,
        provider_user_uuid = excluded.provider_user_uuid,
        provider_org_uuid = excluded.provider_org_uuid`,
      [
        event.uuid,
        event.eventType,
        event.userUuid,
        event.organizationUuid,
        event.cipherUuid,
        event.collectionUuid,
        event.groupUuid,
        event.organizationUserUuid,
        event.actingUserUuid,
        event.deviceType,
        event.ipAddress,
        event.eventDate,
        event.policyUuid,
        event.providerUuid,
        event.providerUserUuid,
        event.providerOrganizationUuid,
      ],
    )
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Event save failed.")
  }
}
