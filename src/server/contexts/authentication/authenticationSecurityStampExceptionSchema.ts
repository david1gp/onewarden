import * as v from "valibot"

export const authenticationSecurityStampExceptionSchema = v.object({
  expire: v.pipe(v.number(), v.integer()),
  routes: v.array(v.string()),
  security_stamp: v.string(),
})

export type AuthenticationSecurityStampException = v.InferOutput<typeof authenticationSecurityStampExceptionSchema>
