import * as v from "valibot"

export const emergencyAccessUpdateRequestSchema = v.object({
  type: v.union([v.literal(0), v.literal(1)]),
  waitTimeDays: v.number(),
  keyEncrypted: v.optional(v.string()),
})

export type EmergencyAccessUpdateRequest = v.InferOutput<typeof emergencyAccessUpdateRequestSchema>
