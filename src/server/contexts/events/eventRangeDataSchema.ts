import * as v from "valibot"
import { eventDateSchema } from "./eventDateSchema.js"

export const eventRangeDataSchema = v.object({
  start: eventDateSchema,
  end: eventDateSchema,
  continuationToken: v.optional(eventDateSchema),
})

export type EventRangeData = v.InferOutput<typeof eventRangeDataSchema>
