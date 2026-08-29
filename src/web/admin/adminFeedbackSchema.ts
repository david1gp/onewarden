import * as v from "valibot"

export const adminFeedbackSchema = v.object({
  kind: v.picklist(["success", "info", "warning", "error"]),
  message: v.string(),
})

export type AdminFeedback = v.InferOutput<typeof adminFeedbackSchema>
