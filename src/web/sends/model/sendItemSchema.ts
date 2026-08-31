import * as v from "valibot"

export const sendItemSchema = v.object({
  id: v.string(),
  accessId: v.string(),
  type: v.union([v.literal(0), v.literal(1)]),
  name: v.string(),
  notes: v.nullable(v.string()),
  text: v.nullable(
    v.object({
      text: v.optional(v.string()),
    }),
  ),
  file: v.nullable(
    v.object({
      id: v.optional(v.string()),
      fileName: v.optional(v.string()),
      size: v.optional(v.union([v.number(), v.string()])),
      sizeName: v.optional(v.string()),
    }),
  ),
  key: v.nullable(v.string()),
  maxAccessCount: v.nullable(v.number()),
  accessCount: v.number(),
  password: v.nullable(v.string()),
  authType: v.number(),
  emails: v.optional(v.nullable(v.string())),
  disabled: v.boolean(),
  hideEmail: v.boolean(),
  revisionDate: v.string(),
  expirationDate: v.nullable(v.string()),
  deletionDate: v.nullable(v.string()),
  object: v.literal("send"),
})

export type SendItem = v.InferOutput<typeof sendItemSchema>
