import type { Clock } from "../../../shared/clock/clock.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import type { DatabaseConnection } from "../../database/database.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { Event } from "./event.js"
import { eventCreate } from "./eventCreate.js"
import type { EventAdapter } from "./eventAdapter.js"
import type { EventCreateData } from "./eventCreateDataSchema.js"
import type { EventLogContext } from "./eventLogContext.js"
import type { EventNotificationAdapter } from "./eventNotificationAdapter.js"

type EventAdapterCreateOptions = {
  clock: Clock
  database: DatabaseConnection
  enabled: boolean
  identifier: Identifier
  notification?: EventNotificationAdapter
}

export function eventAdapterCreate(options: EventAdapterCreateOptions): EventAdapter {
  const create = (data: EventCreateData) => {
    if (!options.enabled) return { success: true as const, data: null }
    try {
      const result = eventCreate(options.database, data, options.clock, options.identifier)
      if (result.success && options.notification !== undefined) eventNotificationSend(options.notification, result.data)
      return result
    } catch {
      return resultErrorCreate("eventAdapterCreate", "Event creation failed.")
    }
  }

  const organizationEventCreate = (
    eventType: number,
    sourceUuid: string,
    organizationUuid: string,
    actingUserUuid: string,
    context: EventLogContext,
  ): void => {
    if (!options.enabled) return
    const source = eventSourceCreate(eventType, sourceUuid)
    create({
      ...source,
      actingUserUuid,
      deviceType: context.deviceType,
      eventDate: context.eventDate,
      eventType,
      ipAddress: context.ipAddress,
      organizationUuid,
    })
  }

  const userEventCreate = (eventType: number, userUuid: string, context: EventLogContext): void => {
    if (!options.enabled) return
    let memberships: Array<{ uuid: string; org_uuid: string }>
    try {
      memberships = options.database
        .query<{ uuid: string; org_uuid: string }, [string]>(
          "SELECT uuid, org_uuid FROM users_organizations WHERE user_uuid = ? AND status = 2",
        )
        .all(userUuid)
    } catch {
      return
    }

    const commonData = {
      actingUserUuid: userUuid,
      deviceType: context.deviceType,
      eventDate: context.eventDate,
      eventType,
      ipAddress: context.ipAddress,
      userUuid,
    }
    create(commonData)
    for (const membership of memberships)
      create({ ...commonData, organizationUserUuid: membership.uuid, organizationUuid: membership.org_uuid })
  }

  const cipherEventCreate = (
    eventType: number,
    cipherUuid: string,
    organizationUuid: string | null,
    actingUserUuid: string,
    context: EventLogContext,
  ): void => {
    if (!options.enabled || organizationUuid === null) return
    create({
      actingUserUuid,
      cipherUuid,
      deviceType: context.deviceType,
      eventDate: context.eventDate,
      eventType,
      ipAddress: context.ipAddress,
      organizationUuid,
    })
  }

  return { cipherEventCreate, create, organizationEventCreate, userEventCreate }
}

function eventSourceCreate(eventType: number, sourceUuid: string): EventCreateData {
  if (eventType >= 1100 && eventType <= 1199) return { cipherUuid: sourceUuid, eventType }
  if (eventType >= 1300 && eventType <= 1399) return { collectionUuid: sourceUuid, eventType }
  if (eventType >= 1400 && eventType <= 1499) return { eventType, groupUuid: sourceUuid }
  if (eventType >= 1500 && eventType <= 1599) return { eventType, organizationUserUuid: sourceUuid }
  if (eventType >= 1700 && eventType <= 1799) return { eventType, policyUuid: sourceUuid }
  return { eventType }
}

function eventNotificationSend(notification: EventNotificationAdapter, event: Event): void {
  try {
    const result = notification.sendEvent(event)
    void Promise.resolve(result).catch(() => undefined)
  } catch {
    return
  }
}
