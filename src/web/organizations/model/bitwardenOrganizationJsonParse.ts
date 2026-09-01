import type { Result } from "#result"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { BitwardenOrganizationJsonPayload } from "./bitwardenOrganizationJsonPayloadSchema.js"
import {
  type BitwardenOrganizationJsonPayloadValidateOptions,
  bitwardenOrganizationJsonPayloadValidate,
} from "./bitwardenOrganizationJsonPayloadValidate.js"

export function bitwardenOrganizationJsonParse(
  content: string,
  options?: BitwardenOrganizationJsonPayloadValidateOptions,
): Result<BitwardenOrganizationJsonPayload> {
  const op = "bitwardenOrganizationJsonParse"
  let input: unknown
  try {
    input = JSON.parse(content)
  } catch {
    return resultErrorCreate(op, "Invalid Bitwarden organization JSON: content is not valid JSON.", {
      code: "platform.invalid-request",
      statusCode: 400,
    })
  }
  return bitwardenOrganizationJsonPayloadValidate(input, options)
}
