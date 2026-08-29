import * as v from "valibot"

export const adminSearchSchema = v.object({
  query: v.string(),
  scope: v.picklist(["users", "organizations"]),
})

export type AdminSearch = v.InferOutput<typeof adminSearchSchema>
