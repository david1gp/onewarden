import * as v from "valibot"

export const adminConfigSchema = v.record(v.string(), v.unknown())

export type AdminConfig = v.InferOutput<typeof adminConfigSchema>
