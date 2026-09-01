import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { event as eventTable } from "../../database/schema/event.js"
import type { Event } from "./event.js"

export function eventSave(database: DatabaseConnection, event: Event): Result<void> {
  const op = "eventSave"
  try {
    database.drizzle
      .insert(eventTable)
      .values({
        uuid: event.uuid,
        eventType: event.eventType,
        userUuid: event.userUuid,
        orgUuid: event.organizationUuid,
        cipherUuid: event.cipherUuid,
        collectionUuid: event.collectionUuid,
        groupUuid: event.groupUuid,
        orgUserUuid: event.organizationUserUuid,
        actUserUuid: event.actingUserUuid,
        deviceType: event.deviceType,
        ipAddress: event.ipAddress,
        eventDate: event.eventDate,
        policyUuid: event.policyUuid,
        providerUuid: event.providerUuid,
        providerUserUuid: event.providerUserUuid,
        providerOrgUuid: event.providerOrganizationUuid,
      })
      .onConflictDoUpdate({
        target: eventTable.uuid,
        set: {
          eventType: event.eventType,
          userUuid: event.userUuid,
          orgUuid: event.organizationUuid,
          cipherUuid: event.cipherUuid,
          collectionUuid: event.collectionUuid,
          groupUuid: event.groupUuid,
          orgUserUuid: event.organizationUserUuid,
          actUserUuid: event.actingUserUuid,
          deviceType: event.deviceType,
          ipAddress: event.ipAddress,
          eventDate: event.eventDate,
          policyUuid: event.policyUuid,
          providerUuid: event.providerUuid,
          providerUserUuid: event.providerUserUuid,
          providerOrgUuid: event.providerOrganizationUuid,
        },
      })
      .run()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Event save failed.")
  }
}
