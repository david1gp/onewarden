import * as v from "valibot"

export const sendAccessResponseSchema = v.object({
  id: v.string(),
  type: v.union([v.literal(0), v.literal(1)]),
  name: v.string(),
  text: v.optional(
    v.nullable(
      v.object({
        text: v.optional(v.string()),
      }),
    ),
  ),
  file: v.optional(
    v.nullable(
      v.object({
        id: v.optional(v.string()),
        fileName: v.optional(v.string()),
        size: v.optional(v.union([v.number(), v.string()])),
        sizeName: v.optional(v.string()),
      }),
    ),
  ),
  expirationDate: v.optional(v.nullable(v.string())),
  creatorIdentifier: v.optional(v.nullable(v.string())),
  object: v.literal("send-access"),
})

export type SendAccessResponse = v.InferOutput<typeof sendAccessResponseSchema>
