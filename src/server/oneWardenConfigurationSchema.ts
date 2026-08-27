import * as v from "valibot"

export const oneWardenConfigurationSchema = v.strictObject({
  databasePath: v.pipe(v.string(), v.minLength(1)),
  disableUserRegistration: v.boolean(),
  domain: v.pipe(
    v.string(),
    v.url(),
    v.check((value) => {
      const url = new URL(value)
      return (
        (url.protocol === "http:" || url.protocol === "https:") &&
        url.username === "" &&
        url.password === "" &&
        url.search === "" &&
        url.hash === ""
      )
    }),
  ),
  experimentalClientFeatureFlags: v.string(),
  suppressOnboardingInterstitials: v.boolean(),
})

export type OneWardenConfiguration = v.InferOutput<typeof oneWardenConfigurationSchema>
