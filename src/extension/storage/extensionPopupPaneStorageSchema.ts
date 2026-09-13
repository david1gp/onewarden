import * as v from "valibot"
import { extensionFullWindowPane } from "../fullwindow/ExtensionFullWindowPane.js"
import { extensionStorageSchemaVersion } from "./extensionStorageSchemaVersion.js"

const extensionPopupPaneStorageDataSchema = v.strictObject({
  pane: v.picklist([extensionFullWindowPane.vault, extensionFullWindowPane.generator]),
})

export const extensionPopupPaneStorageSchema = v.strictObject({
  schemaVersion: v.literal(extensionStorageSchemaVersion),
  ...extensionPopupPaneStorageDataSchema.entries,
})

export type ExtensionPopupPaneStorage = v.InferOutput<typeof extensionPopupPaneStorageDataSchema>
