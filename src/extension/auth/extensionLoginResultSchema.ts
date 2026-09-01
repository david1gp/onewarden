import * as v from "valibot"
import { extensionLoginChallengeSchema } from "./extensionLoginChallengeSchema.js"

export const extensionLoginResultSchema = v.variant("status", [
  v.strictObject({ status: v.literal("authenticated") }),
  v.strictObject({ status: v.literal("challenge"), challenge: extensionLoginChallengeSchema }),
])

export type ExtensionLoginResult = v.InferOutput<typeof extensionLoginResultSchema>
