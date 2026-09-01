import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { authRequests } from "../../database/schema/authRequests.js"
import type { IdentityAuthRequest } from "./identityAuthRequest.js"
import { identityAuthRequestFromRow } from "./identityAuthRequestFromRow.js"
import { and, desc, eq, isNull } from "drizzle-orm"

export function identityAuthRequestFindByUserAndRequestedDevice(
  database: DatabaseConnection,
  userUuid: string,
  deviceUuid: string,
): Result<IdentityAuthRequest | null> {
  const op = "identityAuthRequestFindByUserAndRequestedDevice"
  try {
    const row = database.drizzle
      .select()
      .from(authRequests)
      .where(
        and(
          eq(authRequests.userUuid, userUuid),
          eq(authRequests.requestDeviceIdentifier, deviceUuid),
          isNull(authRequests.approved),
        ),
      )
      .orderBy(desc(authRequests.creationDate))
      .limit(1)
      .get()
    return resultCreate(row === undefined ? null : identityAuthRequestFromRow(row))
  } catch {
    return resultErrorCreate(op, "Auth request lookup failed.")
  }
}
