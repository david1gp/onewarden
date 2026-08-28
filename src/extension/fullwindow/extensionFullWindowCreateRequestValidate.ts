import * as v from "valibot"
import type { Result } from "#result"
import {
  type ExtensionCreateLoginRequest,
  extensionCreateLoginRequestSchema,
} from "../create/extensionCreateLoginRequestSchema.js"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"

const op = "extensionFullWindowCreateRequestValidate"

/** Validates a mapped create request and reports the first problem in wording the form can show. */
export function extensionFullWindowCreateRequestValidate(
  request: ExtensionCreateLoginRequest,
): Result<ExtensionCreateLoginRequest> {
  if (request.name === "") return invalid("Enter a name for this login.")
  if (request.uris.length === 0) return invalid("Enter at least one website URI.")
  if (request.fields.some((field) => field.name === "")) return invalid("Give every custom field a name.")

  const parsed = v.safeParse(extensionCreateLoginRequestSchema, request)
  if (!parsed.success) return invalid("Check the highlighted fields and try again.")
  return resultCreate(parsed.output)
}

function invalid(message: string): Result<ExtensionCreateLoginRequest> {
  return resultErrorCreate(op, message, { code: "platform.invalid-request", statusCode: 400 })
}
