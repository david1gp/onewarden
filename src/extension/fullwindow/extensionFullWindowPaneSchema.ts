import * as v from "valibot"

export const extensionFullWindowPaneSchema = v.picklist(["vault", "generator", "settings"])

export type ExtensionFullWindowPaneValue = v.InferOutput<typeof extensionFullWindowPaneSchema>
