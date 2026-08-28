import * as v from "valibot"

export const authenticationClientVersionSchema = v.object({
  build: v.array(v.string()),
  major: v.pipe(v.number(), v.integer(), v.minValue(0)),
  minor: v.pipe(v.number(), v.integer(), v.minValue(0)),
  patch: v.pipe(v.number(), v.integer(), v.minValue(0)),
  preRelease: v.array(v.string()),
  raw: v.string(),
})

export type AuthenticationClientVersion = v.InferOutput<typeof authenticationClientVersionSchema>
