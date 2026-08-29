import type { AuthenticationContext } from "../authentication/authenticationContext.js"
import type { EventLogContext } from "./eventLogContext.js"

export function eventLogContextCreate(authentication: AuthenticationContext): EventLogContext {
  return {
    deviceType: authentication.device.type,
    ipAddress: authentication.ip,
  }
}
