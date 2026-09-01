import * as v from "valibot"

export const extensionFullWindowPaneSchema = v.picklist(["vault", "generator", "settings", "auth"])

export type ExtensionFullWindowPaneValue = v.InferOutput<typeof extensionFullWindowPaneSchema>
