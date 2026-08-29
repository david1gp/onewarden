import * as v from "valibot"

export const emergencyAccessTakeoverRequestSchema = v.object({
  newMasterPasswordHash: v.string(),
  key: v.string(),
})

export type EmergencyAccessTakeoverRequest = v.InferOutput<typeof emergencyAccessTakeoverRequestSchema>
