import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { authRequests, type AuthRequestInsert } from "../../database/schema/authRequests.js"
import type { IdentityAuthRequest } from "./identityAuthRequest.js"

export function identityAuthRequestSave(database: DatabaseConnection, request: IdentityAuthRequest): Result<void> {
  const op = "identityAuthRequestSave"
  try {
    const values: AuthRequestInsert = {
      uuid: request.uuid,
      userUuid: request.userUuid,
      organizationUuid: request.organizationUuid,
      requestDeviceIdentifier: request.requestDeviceIdentifier,
      deviceType: request.deviceType,
      requestIp: request.requestIp,
      responseDeviceId: request.responseDeviceId,
      accessCode: request.accessCode,
      publicKey: request.publicKey,
      encKey: request.encKey,
      masterPasswordHash: request.masterPasswordHash,
      approved: request.approved,
      creationDate: request.creationDate,
      responseDate: request.responseDate,
      authenticationDate: request.authenticationDate,
    }
    database.drizzle
      .insert(authRequests)
      .values(values)
      .onConflictDoUpdate({
        target: authRequests.uuid,
        set: {
          userUuid: values.userUuid,
          organizationUuid: values.organizationUuid,
          requestDeviceIdentifier: values.requestDeviceIdentifier,
          deviceType: values.deviceType,
          requestIp: values.requestIp,
          responseDeviceId: values.responseDeviceId,
          accessCode: values.accessCode,
          publicKey: values.publicKey,
          encKey: values.encKey,
          masterPasswordHash: values.masterPasswordHash,
          approved: values.approved,
          creationDate: values.creationDate,
          responseDate: values.responseDate,
          authenticationDate: values.authenticationDate,
        },
      })
      .run()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Auth request save failed.")
  }
}
