import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { Event } from "./event.js"
import type { EventCreateData } from "./eventCreateDataSchema.js"
import { eventSave } from "./eventSave.js"

export function eventCreate(
  database: DatabaseConnection,
  data: EventCreateData,
  clock: Clock,
  identifier: Identifier,
): Result<Event> {
  const op = "eventCreate"
  try {
    const eventDate = data.eventDate ?? clock.now().toISOString()
    const parsedDate = new Date(eventDate)
    if (Number.isNaN(parsedDate.getTime())) return resultErrorCreate(op, "Event date is invalid.")
    const event: Event = {
      uuid: identifier.uuid(),
      eventType: data.eventType,
      userUuid: data.userUuid ?? null,
      organizationUuid: data.organizationUuid ?? null,
      cipherUuid: data.cipherUuid ?? null,
      collectionUuid: data.collectionUuid ?? null,
      groupUuid: data.groupUuid ?? null,
      organizationUserUuid: data.organizationUserUuid ?? null,
      actingUserUuid: data.actingUserUuid ?? null,
      deviceType: data.deviceType ?? null,
      ipAddress: data.ipAddress ?? null,
      eventDate: parsedDate.toISOString(),
      policyUuid: data.policyUuid ?? null,
      providerUuid: data.providerUuid ?? null,
      providerUserUuid: data.providerUserUuid ?? null,
      providerOrganizationUuid: data.providerOrganizationUuid ?? null,
    }
    const saveResult = eventSave(database, event)
    if (!saveResult.success) return saveResult
    return resultCreate(event)
  } catch {
    return resultErrorCreate(op, "Event creation failed.")
  }
}
