import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { ssoUsers, type SsoUserInsert } from "../../database/schema/ssoUsers.js"
import type { IdentitySsoUser } from "./identitySsoUser.js"

export function identitySsoUserSave(database: DatabaseConnection, ssoUser: IdentitySsoUser): Result<void> {
  const op = "identitySsoUserSave"
  try {
    const values: SsoUserInsert = { userUuid: ssoUser.userUuid, identifier: ssoUser.identifier }
    database.drizzle
      .insert(ssoUsers)
      .values(values)
      .onConflictDoUpdate({ target: ssoUsers.userUuid, set: { identifier: values.identifier } })
      .run()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "SSO user save failed.")
  }
}
