import { constantTimeStringsEqual } from "../../../shared/crypto/constantTimeStringsEqual.js"
import type { IdentityAuthRequest } from "./identityAuthRequest.js"

export function identityAuthRequestAccessCodeCheck(request: IdentityAuthRequest, accessCode: string): boolean {
  return constantTimeStringsEqual(request.accessCode, accessCode)
}
