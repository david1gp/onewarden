import type { Context } from "hono"
import type { IdentityClientIpConfiguration } from "./identityClientIpConfiguration.js"
import { identityClientIpResolve } from "./identityClientIpResolve.js"
import { identityDeviceTypeParse } from "./identityDeviceTypeParse.js"

export function identityClientHeadersResolve(
  context: Context,
  clientIpConfiguration?: IdentityClientIpConfiguration,
): { deviceType: number; ipAddress: string } {
  return {
    deviceType: identityDeviceTypeParse(context.req.header("device-type")),
    ipAddress: identityClientIpResolve(context, clientIpConfiguration),
  }
}
