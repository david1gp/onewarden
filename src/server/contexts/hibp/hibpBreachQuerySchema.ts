import * as v from "valibot"

export const hibpBreachQuerySchema = v.object({
  username: v.string(),
})

export type HibpBreachQuery = v.InferOutput<typeof hibpBreachQuerySchema>
