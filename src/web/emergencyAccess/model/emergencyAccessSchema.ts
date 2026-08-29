import * as v from "valibot"

export const emergencyAccessContactSchema = v.object({
  id: v.string(),
  status: v.number(), // 0: invited, 1: accepted, 2: confirmed, 3: recoveryInitiated, 4: recoveryApproved
  type: v.union([v.literal(0), v.literal(1)]), // 0: View, 1: Takeover
  waitTimeDays: v.number(),
  granteeId: v.optional(v.nullable(v.string())),
  grantorId: v.optional(v.nullable(v.string())),
  email: v.optional(v.nullable(v.string())),
  name: v.optional(v.nullable(v.string())),
  avatarColor: v.optional(v.nullable(v.string())),
  keyEncrypted: v.optional(v.nullable(v.string())),
  recoveryInitiatedAt: v.optional(v.nullable(v.string())),
  object: v.optional(v.string()),
})

export type EmergencyAccessContact = v.InferOutput<typeof emergencyAccessContactSchema>

export const emergencyAccessListResponseSchema = v.object({
  data: v.array(emergencyAccessContactSchema),
  object: v.literal("list"),
  continuationToken: v.nullable(v.unknown()),
})

export type EmergencyAccessListResponse = v.InferOutput<typeof emergencyAccessListResponseSchema>
