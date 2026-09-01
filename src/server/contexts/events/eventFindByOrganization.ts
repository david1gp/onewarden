import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { and, between, desc, eq } from "drizzle-orm"
import { event as eventTable, type EventRow } from "../../database/schema/event.js"
import type { Event } from "./event.js"
import { eventFromRow } from "./eventFromRow.js"

export function eventFindByOrganization(
  database: DatabaseConnection,
  organizationUuid: string,
  startDate: string,
  endDate: string,
): Result<Event[]> {
  const op = "eventFindByOrganization"
  try {
    const rows: EventRow[] = database.drizzle
      .select()
      .from(eventTable)
      .where(and(eq(eventTable.orgUuid, organizationUuid), between(eventTable.eventDate, startDate, endDate)))
      .orderBy(desc(eventTable.eventDate))
      .limit(30)
      .all()
    return resultCreate(rows.map(eventFromRow))
  } catch {
    return resultErrorCreate(op, "Organization event lookup failed.")
  }
}
