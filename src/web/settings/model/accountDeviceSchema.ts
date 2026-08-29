import * as v from "valibot"

export const accountDeviceSchema = v.object({
  id: v.string(),
  name: v.nullable(v.string()),
  type: v.number(),
  identifier: v.nullable(v.string()),
  creationDate: v.string(),
  ip: v.nullable(v.string()),
  isCurrent: v.optional(v.boolean()),
  object: v.literal("device"),
})

export const accountDeviceListResponseSchema = v.object({
  data: v.array(accountDeviceSchema),
  continuationToken: v.nullable(v.string()),
  object: v.literal("list"),
})

export type AccountDevice = v.InferOutput<typeof accountDeviceSchema>
export type AccountDeviceListResponse = v.InferOutput<typeof accountDeviceListResponseSchema>
