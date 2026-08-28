import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { EmergencyAccess } from "./emergencyAccess.js"

export function emergencyAccessToJson(access: EmergencyAccess): Result<Record<string, unknown>> {
  return resultCreate({
    id: access.uuid,
    status: access.status,
    type: access.type,
    waitTimeDays: access.waitTimeDays,
    object: "emergencyAccess",
  })
}
