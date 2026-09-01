import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { and, between, desc, eq } from "drizzle-orm"
import { event as eventTable, type EventRow } from "../../database/schema/event.js"
import type { Event } from "./event.js"
import { eventFromRow } from "./eventFromRow.js"

export function eventFindByCipher(
  database: DatabaseConnection,
  cipherUuid: string,
  startDate: string,
  endDate: string,
): Result<Event[]> {
  const op = "eventFindByCipher"
  try {
    const rows: EventRow[] = database.drizzle
      .select()
      .from(eventTable)
      .where(and(eq(eventTable.cipherUuid, cipherUuid), between(eventTable.eventDate, startDate, endDate)))
      .orderBy(desc(eventTable.eventDate))
      .limit(30)
      .all()
    return resultCreate(rows.map(eventFromRow))
  } catch {
    return resultErrorCreate(op, "Cipher event lookup failed.")
  }
}
