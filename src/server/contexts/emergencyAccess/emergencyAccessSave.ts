import { eq } from "drizzle-orm"
import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { type EmergencyAccessInsert, emergencyAccess } from "../../database/schema/emergencyAccess.js"
import { users } from "../../database/schema/users.js"
import type { EmergencyAccess } from "./emergencyAccess.js"

export function emergencyAccessSave(database: DatabaseConnection, access: EmergencyAccess, now: string): Result<void> {
  const op = "emergencyAccessSave"
  try {
    access.updatedAt = now
    const values: EmergencyAccessInsert = {
      uuid: access.uuid,
      grantorUuid: access.grantorUuid,
      granteeUuid: access.granteeUuid,
      email: access.email,
      keyEncrypted: access.keyEncrypted,
      atype: access.type,
      status: access.status,
      waitTimeDays: access.waitTimeDays,
      recoveryInitiatedAt: access.recoveryInitiatedAt,
      lastNotificationAt: access.lastNotificationAt,
      updatedAt: access.updatedAt,
      createdAt: access.createdAt,
    }
    database.drizzle
      .insert(emergencyAccess)
      .values(values)
      .onConflictDoUpdate({
        target: emergencyAccess.uuid,
        set: {
          grantorUuid: values.grantorUuid,
          granteeUuid: values.granteeUuid,
          email: values.email,
          keyEncrypted: values.keyEncrypted,
          atype: values.atype,
          status: values.status,
          waitTimeDays: values.waitTimeDays,
          recoveryInitiatedAt: values.recoveryInitiatedAt,
          lastNotificationAt: values.lastNotificationAt,
          updatedAt: values.updatedAt,
        },
      })
      .run()
    database.drizzle.update(users).set({ updatedAt: now }).where(eq(users.uuid, access.grantorUuid)).run()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Emergency access save failed.")
  }
}
