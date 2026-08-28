import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { identityDeviceFindByUuidAndUser } from "./identityDeviceFindByUuidAndUser.js"
import type { IdentityAccessTokenClaims } from "./identityAccessTokenClaimsSchema.js"
import { identityUserFindByUuid } from "./identityUserFindByUuid.js"

export function identityAccessTokenRevocationCheck(
  database: DatabaseConnection,
  claims: IdentityAccessTokenClaims,
): Result<{ userUuid: string; deviceUuid: string }> {
  const op = "identityAccessTokenRevocationCheck"
  const deviceResult = identityDeviceFindByUuidAndUser(database, claims.device, claims.sub)
  if (!deviceResult.success) return deviceResult
  if (deviceResult.data === null) return resultErrorCreate(op, "Access token has been revoked.")
  const userResult = identityUserFindByUuid(database, claims.sub)
  if (!userResult.success) return userResult
  if (userResult.data === null || userResult.data.securityStamp !== claims.sstamp) {
    return resultErrorCreate(op, "Access token has been revoked.")
  }
  return resultCreate({ userUuid: claims.sub, deviceUuid: deviceResult.data.uuid })
}
