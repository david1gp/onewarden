import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityAuthRequest } from "./identityAuthRequest.js"

export function identityAuthRequestSave(database: DatabaseConnection, request: IdentityAuthRequest): Result<void> {
  const op = "identityAuthRequestSave"
  try {
    database.run(
      `INSERT INTO auth_requests (
         uuid, user_uuid, organization_uuid, request_device_identifier, device_type,
         request_ip, response_device_id, access_code, public_key, enc_key,
         master_password_hash, approved, creation_date, response_date, authentication_date
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(uuid) DO UPDATE SET
         user_uuid = excluded.user_uuid,
         organization_uuid = excluded.organization_uuid,
         request_device_identifier = excluded.request_device_identifier,
         device_type = excluded.device_type,
         request_ip = excluded.request_ip,
         response_device_id = excluded.response_device_id,
         access_code = excluded.access_code,
         public_key = excluded.public_key,
         enc_key = excluded.enc_key,
         master_password_hash = excluded.master_password_hash,
         approved = excluded.approved,
         creation_date = excluded.creation_date,
         response_date = excluded.response_date,
         authentication_date = excluded.authentication_date`,
      [
        request.uuid,
        request.userUuid,
        request.organizationUuid,
        request.requestDeviceIdentifier,
        request.deviceType,
        request.requestIp,
        request.responseDeviceId,
        request.accessCode,
        request.publicKey,
        request.encKey,
        request.masterPasswordHash,
        request.approved === null ? null : request.approved ? 1 : 0,
        request.creationDate,
        request.responseDate,
        request.authenticationDate,
      ],
    )
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Auth request save failed.")
  }
}
