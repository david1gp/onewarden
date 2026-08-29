import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { Event } from "./event.js"
import { eventFromRow } from "./eventFromRow.js"
import type { EventRow } from "./eventRow.js"

export function eventFindByOrganizationUser(
  database: DatabaseConnection,
  organizationUuid: string,
  organizationUserUuid: string,
  startDate: string,
  endDate: string,
): Result<Event[]> {
  const op = "eventFindByOrganizationUser"
  try {
    const rows = database
      .query<EventRow, [string, string, string, string, string, string]>(
        `SELECT event.uuid, event.event_type, event.user_uuid, event.org_uuid, event.cipher_uuid,
           event.collection_uuid, event.group_uuid, event.org_user_uuid, event.act_user_uuid,
           event.device_type, event.ip_address, event.event_date, event.policy_uuid,
           event.provider_uuid, event.provider_user_uuid, event.provider_org_uuid
         FROM event
         INNER JOIN users_organizations AS member
           ON member.uuid = ? AND member.org_uuid = ?
         WHERE event.org_uuid = ?
           AND event.event_date BETWEEN ? AND ?
           AND (
             event.org_user_uuid = ?
             OR event.user_uuid = member.user_uuid
             OR event.act_user_uuid = member.user_uuid
           )
           ORDER BY event.event_date DESC
         LIMIT 30`,
      )
      .all(organizationUserUuid, organizationUuid, organizationUuid, startDate, endDate, organizationUserUuid)
    return resultCreate(rows.map(eventFromRow))
  } catch {
    return resultErrorCreate(op, "Organization user event lookup failed.")
  }
}
