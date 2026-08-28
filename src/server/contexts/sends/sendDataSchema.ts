import * as v from "valibot"

const sendDataNumberSchema = v.union([v.number(), v.string()])
const sendDataValueSchema = v.optional(v.nullable(v.unknown()))

export const sendDataSchema = v.object({
  type: v.union([v.literal(0), v.literal(1)]),
  key: v.string(),
  password: v.optional(v.nullable(v.string())),
  maxAccessCount: v.optional(v.nullable(sendDataNumberSchema)),
  expirationDate: v.optional(v.nullable(v.string())),
  deletionDate: v.string(),
  disabled: v.boolean(),
  hideEmail: v.optional(v.nullable(v.boolean())),
  emails: v.optional(v.nullable(v.string())),
  name: v.string(),
  notes: v.optional(v.nullable(v.string())),
  text: sendDataValueSchema,
  file: sendDataValueSchema,
  fileLength: v.optional(v.nullable(sendDataNumberSchema)),
  id: v.optional(v.nullable(v.string())),
})

export type SendData = v.InferOutput<typeof sendDataSchema>
