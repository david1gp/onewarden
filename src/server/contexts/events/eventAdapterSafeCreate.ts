import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { EventAdapter } from "./eventAdapter.js"
import type { EventCreateData } from "./eventCreateDataSchema.js"
import type { EventLogContext } from "./eventLogContext.js"

export function eventAdapterSafeCreate(adapter: EventAdapter): EventAdapter {
  const create = (data: EventCreateData) => {
    try {
      return adapter.create(data)
    } catch {
      return resultErrorCreate("eventAdapterSafeCreate", "Event creation failed.")
    }
  }
  const organizationEventCreate = (
    eventType: number,
    sourceUuid: string,
    organizationUuid: string,
    actingUserUuid: string,
    context: EventLogContext,
  ): void => {
    try {
      adapter.organizationEventCreate(eventType, sourceUuid, organizationUuid, actingUserUuid, context)
    } catch {
      return
    }
  }
  const cipherEventCreate = (
    eventType: number,
    cipherUuid: string,
    organizationUuid: string | null,
    actingUserUuid: string,
    context: EventLogContext,
  ): void => {
    try {
      adapter.cipherEventCreate(eventType, cipherUuid, organizationUuid, actingUserUuid, context)
    } catch {
      return
    }
  }
  const userEventCreate = (eventType: number, userUuid: string, context: EventLogContext): void => {
    try {
      adapter.userEventCreate(eventType, userUuid, context)
    } catch {
      return
    }
  }
  return { cipherEventCreate, create, organizationEventCreate, userEventCreate }
}
