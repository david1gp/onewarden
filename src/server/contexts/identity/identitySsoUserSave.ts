import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentitySsoUser } from "./identitySsoUser.js"

export function identitySsoUserSave(database: DatabaseConnection, ssoUser: IdentitySsoUser): Result<void> {
  const op = "identitySsoUserSave"
  try {
    database.run(
      `INSERT INTO sso_users (user_uuid, identifier) VALUES (?, ?)
       ON CONFLICT(user_uuid) DO UPDATE SET identifier = excluded.identifier`,
      [ssoUser.userUuid, ssoUser.identifier],
    )
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "SSO user save failed.")
  }
}
