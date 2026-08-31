import * as v from "valibot"
import { extensionLockPolicySchema } from "./extensionLockPolicySchema.js"

export const extensionLockPolicyRequestSchema = v.omit(extensionLockPolicySchema, ["schemaVersion"])

export type ExtensionLockPolicyRequest = v.InferOutput<typeof extensionLockPolicyRequestSchema>
