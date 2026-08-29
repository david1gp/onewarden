import * as v from "valibot"
import { eventDateSchema } from "./eventDateSchema.js"

export const eventCreateDataSchema = v.object({
  eventType: v.pipe(v.number(), v.integer()),
  userUuid: v.optional(v.nullable(v.string())),
  organizationUuid: v.optional(v.nullable(v.string())),
  cipherUuid: v.optional(v.nullable(v.string())),
  collectionUuid: v.optional(v.nullable(v.string())),
  groupUuid: v.optional(v.nullable(v.string())),
  organizationUserUuid: v.optional(v.nullable(v.string())),
  actingUserUuid: v.optional(v.nullable(v.string())),
  deviceType: v.optional(v.nullable(v.number())),
  ipAddress: v.optional(v.nullable(v.string())),
  eventDate: v.optional(v.nullable(eventDateSchema)),
  policyUuid: v.optional(v.nullable(v.string())),
  providerUuid: v.optional(v.nullable(v.string())),
  providerUserUuid: v.optional(v.nullable(v.string())),
  providerOrganizationUuid: v.optional(v.nullable(v.string())),
})

export type EventCreateData = v.InferOutput<typeof eventCreateDataSchema>
