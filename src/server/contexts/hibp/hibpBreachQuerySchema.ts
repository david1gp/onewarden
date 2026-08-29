import * as v from "valibot"

export const hibpBreachQuerySchema = v.object({
  username: v.pipe(v.string(), v.minLength(1)),
})

export type HibpBreachQuery = v.InferOutput<typeof hibpBreachQuerySchema>
