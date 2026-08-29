import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { Event } from "./event.js"
import { eventFromRow } from "./eventFromRow.js"
import type { EventRow } from "./eventRow.js"

export function eventFindByCipher(
  database: DatabaseConnection,
  cipherUuid: string,
  startDate: string,
  endDate: string,
): Result<Event[]> {
  const op = "eventFindByCipher"
  try {
    const rows = database
      .query<EventRow, [string, string, string]>(
        `SELECT uuid, event_type, user_uuid, org_uuid, cipher_uuid, collection_uuid,
           group_uuid, org_user_uuid, act_user_uuid, device_type, ip_address,
           event_date, policy_uuid, provider_uuid, provider_user_uuid, provider_org_uuid
         FROM event
         WHERE cipher_uuid = ? AND event_date BETWEEN ? AND ?
           ORDER BY event_date DESC
         LIMIT 30`,
      )
      .all(cipherUuid, startDate, endDate)
    return resultCreate(rows.map(eventFromRow))
  } catch {
    return resultErrorCreate(op, "Cipher event lookup failed.")
  }
}
