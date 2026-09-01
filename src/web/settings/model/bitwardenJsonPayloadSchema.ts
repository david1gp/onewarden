import * as v from "valibot"
import { isoTimestampSchema } from "../../../shared/validation/isoTimestampSchema.js"
import { bitwardenJsonItemSchema } from "./bitwardenJsonItemSchema.js"

const bitwardenJsonFolderSchema = v.object({
  id: v.optional(v.nullable(v.string())),
  name: v.string(),
  revisionDate: v.optional(isoTimestampSchema),
  object: v.optional(v.literal("folder")),
})

export const bitwardenJsonPayloadSchema = v.object({
  encrypted: v.literal(false),
  folders: v.array(bitwardenJsonFolderSchema),
  items: v.array(bitwardenJsonItemSchema),
})

export type BitwardenJsonPayload = v.InferOutput<typeof bitwardenJsonPayloadSchema>
