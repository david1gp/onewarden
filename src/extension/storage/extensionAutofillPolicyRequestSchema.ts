import * as v from "valibot"

export const extensionAutofillPolicyRequestSchema = v.strictObject({
  pageLoadEnabled: v.boolean(),
  disabledSites: v.pipe(v.array(v.pipe(v.string(), v.minLength(1), v.maxLength(253))), v.maxLength(500)),
})
