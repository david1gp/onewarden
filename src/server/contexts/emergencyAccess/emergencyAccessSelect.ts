import { emergencyAccess } from "../../database/schema/emergencyAccess.js"

export const emergencyAccessSelect = {
  uuid: emergencyAccess.uuid,
  grantorUuid: emergencyAccess.grantorUuid,
  granteeUuid: emergencyAccess.granteeUuid,
  email: emergencyAccess.email,
  keyEncrypted: emergencyAccess.keyEncrypted,
  type: emergencyAccess.atype,
  status: emergencyAccess.status,
  waitTimeDays: emergencyAccess.waitTimeDays,
  recoveryInitiatedAt: emergencyAccess.recoveryInitiatedAt,
  lastNotificationAt: emergencyAccess.lastNotificationAt,
  updatedAt: emergencyAccess.updatedAt,
  createdAt: emergencyAccess.createdAt,
}
