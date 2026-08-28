import * as v from "valibot"

export const syncDomainsDataSchema = v.object({
  excludedGlobalEquivalentDomains: v.optional(v.array(v.number()), []),
  equivalentDomains: v.optional(v.array(v.array(v.string())), []),
})

export type SyncDomainsData = v.InferOutput<typeof syncDomainsDataSchema>
