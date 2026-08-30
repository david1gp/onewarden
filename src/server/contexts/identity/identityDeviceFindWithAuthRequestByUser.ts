import { type Result } from "#result"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityAuthRequest } from "./identityAuthRequest.js"
import { identityAuthRequestFindPendingByUserAndDevice } from "./identityAuthRequestFindPendingByUserAndDevice.js"
import type { IdentityDevice } from "./identityDevice.js"
import { identityDeviceFindByUser } from "./identityDeviceFindByUser.js"

export function identityDeviceFindWithAuthRequestByUser(
  database: DatabaseConnection,
  userUuid: string,
): Result<Array<{ device: IdentityDevice; pendingAuthRequest: IdentityAuthRequest | null }>> {
  const devicesResult = identityDeviceFindByUser(database, userUuid)
  if (!devicesResult.success) return devicesResult

  const data: Array<{ device: IdentityDevice; pendingAuthRequest: IdentityAuthRequest | null }> = []
  for (const device of devicesResult.data) {
    const pendingAuthRequestResult = identityAuthRequestFindPendingByUserAndDevice(database, userUuid, device.uuid)
    if (!pendingAuthRequestResult.success) return pendingAuthRequestResult
    data.push({ device, pendingAuthRequest: pendingAuthRequestResult.data })
  }
  return { success: true, data }
}
