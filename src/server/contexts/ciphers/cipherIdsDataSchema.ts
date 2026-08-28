import * as v from "valibot"

export const cipherIdsDataSchema = v.object({ ids: v.array(v.string()) })

export type CipherIdsData = v.InferOutput<typeof cipherIdsDataSchema>
