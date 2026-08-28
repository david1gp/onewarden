import * as v from "valibot"

const environmentHostSchema = v.pipe(v.string(), v.trim(), v.minLength(1))

const environmentPortSchema = v.pipe(
  v.string(),
  v.trim(),
  v.regex(/^\d+$/, "PORT must be an integer from 1 to 65535"),
  v.transform(Number),
  v.integer(),
  v.minValue(1),
  v.maxValue(65535),
)

export const environmentSchema = v.object({
  HOST: v.optional(environmentHostSchema, "127.0.0.1"),
  PORT: v.optional(environmentPortSchema, "3000"),
})

export type Environment = v.InferOutput<typeof environmentSchema>
