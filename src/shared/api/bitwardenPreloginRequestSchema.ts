import * as v from "valibot"

export const bitwardenPreloginRequestSchema = v.object({ email: v.string() })

export type BitwardenPreloginRequest = v.InferOutput<typeof bitwardenPreloginRequestSchema>
