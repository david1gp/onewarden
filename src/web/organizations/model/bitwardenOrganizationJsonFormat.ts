import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { BitwardenOrganizationJsonPayload } from "./bitwardenOrganizationJsonPayloadSchema.js"
import {
  type BitwardenOrganizationJsonPayloadValidateOptions,
  bitwardenOrganizationJsonPayloadValidate,
} from "./bitwardenOrganizationJsonPayloadValidate.js"

export function bitwardenOrganizationJsonFormat(
  payload: BitwardenOrganizationJsonPayload,
  options?: BitwardenOrganizationJsonPayloadValidateOptions,
): Result<string> {
  const validated = bitwardenOrganizationJsonPayloadValidate(payload, options)
  if (!validated.success) return validated
  return resultCreate(JSON.stringify(validated.data, null, 2))
}
