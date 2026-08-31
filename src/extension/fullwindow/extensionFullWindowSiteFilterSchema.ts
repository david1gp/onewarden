import * as v from "valibot"

export const extensionFullWindowSiteFilterSchema = v.literal("1")

export type ExtensionFullWindowSiteFilter = v.InferOutput<typeof extensionFullWindowSiteFilterSchema>
