import * as v from "valibot"

export const adminSectionSchema = v.picklist(["settings", "users", "organizations", "diagnostics"])

export type AdminSection = v.InferOutput<typeof adminSectionSchema>
