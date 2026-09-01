import * as v from "valibot"

export const vaultSortSchema = v.picklist([
  "name-az",
  "name-za",
  "created-newest",
  "created-oldest",
  "updated-newest",
  "updated-oldest",
])

export type VaultSort = v.InferOutput<typeof vaultSortSchema>
