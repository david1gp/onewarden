import * as v from "valibot"

export const extensionAccountFlowSchema = v.picklist(["register", "verify", "password-setup"])

export type ExtensionAccountFlow = v.InferOutput<typeof extensionAccountFlowSchema>
