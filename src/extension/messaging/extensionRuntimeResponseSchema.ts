import * as v from "valibot"
import type { Result } from "#result"

const extensionRuntimeResultOkSchema = v.strictObject({
  success: v.literal(true),
  data: v.unknown(),
})

const extensionRuntimeResultErrorSchema = v.strictObject({
  success: v.literal(false),
  op: v.string(),
  code: v.optional(v.string()),
  errorMessage: v.string(),
  errorData: v.optional(v.nullable(v.string())),
  statusCode: v.optional(v.number()),
})

export const extensionRuntimeResponseSchema = v.union([
  extensionRuntimeResultOkSchema,
  extensionRuntimeResultErrorSchema,
])

export type ExtensionRuntimeResponse<T = unknown> = Result<T>
