import * as v from "valibot"
import { extensionCreateLoginRequestSchema } from "../create/extensionCreateLoginRequestSchema.js"
import { extensionLoginFillRequestSchema } from "../fill/extensionLoginFillRequestSchema.js"

const extensionRuntimeSurfaceSchema = v.picklist(["popup", "fullwindow"])

const extensionRuntimeMessageSchemaData = v.variant("type", [
  v.strictObject({ type: v.literal("initialize") }),
  v.strictObject({ type: v.literal("login"), request: v.unknown() }),
  v.strictObject({ type: v.literal("unlock"), request: v.unknown() }),
  v.strictObject({
    type: v.literal("viewModelLoad"),
    surface: v.optional(extensionRuntimeSurfaceSchema, "popup"),
  }),
  v.strictObject({ type: v.literal("conditionalSync") }),
  v.strictObject({ type: v.literal("manualSync") }),
  v.strictObject({ type: v.literal("createLogin"), request: extensionCreateLoginRequestSchema }),
  v.strictObject({ type: v.literal("draftSave"), request: extensionCreateLoginRequestSchema }),
  v.strictObject({ type: v.literal("draftDiscard"), request: v.pipe(v.string(), v.minLength(1)) }),
  v.strictObject({ type: v.literal("environmentSave"), request: v.unknown() }),
  v.strictObject({ type: v.literal("lock") }),
  v.strictObject({ type: v.literal("logout") }),
  v.strictObject({ type: v.literal("activeTabContextLookup") }),
  v.strictObject({ type: v.literal("loginFill"), request: extensionLoginFillRequestSchema }),
  v.strictObject({ type: v.literal("fullWindowOpen") }),
])

export const extensionRuntimeMessageSchema = extensionRuntimeMessageSchemaData

export type ExtensionRuntimeMessage = v.InferOutput<typeof extensionRuntimeMessageSchema>
