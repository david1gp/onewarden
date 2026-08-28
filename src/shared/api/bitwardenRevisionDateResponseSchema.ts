import * as v from "valibot"

export const bitwardenRevisionDateResponseSchema = v.number()

export type BitwardenRevisionDateResponse = v.InferOutput<typeof bitwardenRevisionDateResponseSchema>
