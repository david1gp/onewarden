import type { Result } from "#result"
import type { Event } from "./event.js"
import type { EventCreateData } from "./eventCreateDataSchema.js"
import type { EventLogContext } from "./eventLogContext.js"

export type EventAdapter = {
  create: (data: EventCreateData) => Result<Event | null>
  organizationEventCreate: (
    eventType: number,
    sourceUuid: string,
    organizationUuid: string,
    actingUserUuid: string,
    context: EventLogContext,
  ) => void
  cipherEventCreate: (
    eventType: number,
    cipherUuid: string,
    organizationUuid: string | null,
    actingUserUuid: string,
    context: EventLogContext,
  ) => void
  userEventCreate: (eventType: number, userUuid: string, context: EventLogContext) => void
}
