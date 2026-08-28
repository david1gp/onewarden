import * as v from "valibot"

const extensionActiveTabContextDataSchema = v.strictObject({
  tabId: v.nullable(v.number()),
  url: v.nullable(v.string()),
  hostname: v.nullable(v.string()),
  fillAvailable: v.boolean(),
})

export const extensionActiveTabContextSchema = extensionActiveTabContextDataSchema

export type ExtensionActiveTabContext = v.InferOutput<typeof extensionActiveTabContextSchema>
