import * as v from "valibot"

export const sendUpdateRequestSchema = v.object({
  type: v.union([v.literal(0), v.literal(1)]),
  name: v.string(),
  notes: v.optional(v.nullable(v.string())),
  text: v.optional(
    v.nullable(
      v.object({
        text: v.string(),
      }),
    ),
  ),
  file: v.optional(
    v.nullable(
      v.object({
        fileName: v.string(),
        size: v.optional(v.string()),
      }),
    ),
  ),
  key: v.string(),
  maxAccessCount: v.optional(v.nullable(v.number())),
  password: v.optional(v.nullable(v.string())),
  emails: v.optional(v.nullable(v.string())),
  disabled: v.boolean(),
  hideEmail: v.optional(v.boolean()),
  expirationDate: v.optional(v.nullable(v.string())),
  deletionDate: v.string(),
})

export type SendUpdateRequest = v.InferOutput<typeof sendUpdateRequestSchema>
