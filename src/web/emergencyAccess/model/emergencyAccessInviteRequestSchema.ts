import * as v from "valibot"

export const emergencyAccessInviteRequestSchema = v.object({
  email: v.pipe(v.string(), v.trim(), v.email()),
  type: v.union([v.literal(0), v.literal(1)]), // 0: View, 1: Takeover
  waitTimeDays: v.number(),
})

export type EmergencyAccessInviteRequest = v.InferOutput<typeof emergencyAccessInviteRequestSchema>
