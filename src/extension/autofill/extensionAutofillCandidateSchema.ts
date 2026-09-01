import * as v from "valibot"

export const extensionAutofillCandidateSchema = v.strictObject({
  id: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
  type: v.picklist([1, 3, 4]),
  name: v.pipe(v.string(), v.maxLength(1_000)),
  subtitle: v.nullable(v.pipe(v.string(), v.maxLength(1_000))),
  permission: v.picklist(["allowed", "readOnly", "restricted"]),
})

export type ExtensionAutofillCandidate = v.InferOutput<typeof extensionAutofillCandidateSchema>
