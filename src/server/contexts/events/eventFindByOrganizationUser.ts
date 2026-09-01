import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { and, between, desc, eq, or } from "drizzle-orm"
import { event as eventTable, type EventRow } from "../../database/schema/event.js"
import { usersOrganizations } from "../../database/schema/usersOrganizations.js"
import type { Event } from "./event.js"
import { eventFromRow } from "./eventFromRow.js"

export function eventFindByOrganizationUser(
  database: DatabaseConnection,
  organizationUuid: string,
  organizationUserUuid: string,
  startDate: string,
  endDate: string,
): Result<Event[]> {
  const op = "eventFindByOrganizationUser"
  try {
    const rows: EventRow[] = database.drizzle
      .select({
        actUserUuid: eventTable.actUserUuid,
        cipherUuid: eventTable.cipherUuid,
        collectionUuid: eventTable.collectionUuid,
        deviceType: eventTable.deviceType,
        eventDate: eventTable.eventDate,
        eventType: eventTable.eventType,
        groupUuid: eventTable.groupUuid,
        ipAddress: eventTable.ipAddress,
        orgUuid: eventTable.orgUuid,
        orgUserUuid: eventTable.orgUserUuid,
        policyUuid: eventTable.policyUuid,
        providerOrgUuid: eventTable.providerOrgUuid,
        providerUserUuid: eventTable.providerUserUuid,
        providerUuid: eventTable.providerUuid,
        userUuid: eventTable.userUuid,
        uuid: eventTable.uuid,
      })
      .from(eventTable)
      .innerJoin(
        usersOrganizations,
        and(eq(usersOrganizations.uuid, organizationUserUuid), eq(usersOrganizations.orgUuid, organizationUuid)),
      )
      .where(
        and(
          eq(eventTable.orgUuid, organizationUuid),
          between(eventTable.eventDate, startDate, endDate),
          or(
            eq(eventTable.orgUserUuid, organizationUserUuid),
            eq(eventTable.userUuid, usersOrganizations.userUuid),
            eq(eventTable.actUserUuid, usersOrganizations.userUuid),
          ),
        ),
      )
      .orderBy(desc(eventTable.eventDate))
      .limit(30)
      .all()
    return resultCreate(rows.map(eventFromRow))
  } catch {
    return resultErrorCreate(op, "Organization user event lookup failed.")
  }
}
