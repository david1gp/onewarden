import * as v from "valibot"
import { eventDateSchema } from "./eventDateSchema.js"

const eventCollectItemSchema = v.object({
  type: v.pipe(v.number(), v.integer()),
  date: eventDateSchema,
  cipherId: v.optional(v.nullable(v.string())),
  organizationId: v.optional(v.nullable(v.string())),
})

export const eventCollectDataSchema = v.array(eventCollectItemSchema)

export type EventCollectData = v.InferOutput<typeof eventCollectDataSchema>
