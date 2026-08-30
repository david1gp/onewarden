import type { Result } from "#result"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityAuthRequest } from "./identityAuthRequest.js"
import { identityAuthRequestFindByUserAndRequestedDevice } from "./identityAuthRequestFindByUserAndRequestedDevice.js"

export function identityAuthRequestFindPendingByUserAndDevice(
  database: DatabaseConnection,
  userUuid: string,
  deviceUuid: string,
): Result<IdentityAuthRequest | null> {
  return identityAuthRequestFindByUserAndRequestedDevice(database, userUuid, deviceUuid)
}
