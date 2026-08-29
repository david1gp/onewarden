import * as v from "valibot"

export const groupIdSchema = v.pipe(v.string(), v.uuid())

export type GroupId = v.InferOutput<typeof groupIdSchema>
