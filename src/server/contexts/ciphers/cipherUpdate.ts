import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import type { DatabaseConnection } from "../../database/database.js"
import { organizationMembershipFindByUserAndOrganization } from "../organizations/organizationMembershipFindByUserAndOrganization.js"
import { organizationMembershipStatus } from "../organizations/organizationMembershipStatus.js"
import type { Cipher } from "./cipher.js"
import type { CipherData } from "./cipherDataSchema.js"
import { cipherApplyData } from "./cipherApplyData.js"
import { cipherAccessFindByUser } from "./cipherAccessFindByUser.js"
import { cipherErrorCreate } from "./cipherErrorCreate.js"
import { cipherFindByUuid } from "./cipherFindByUuid.js"

function cipherRevisionIsStale(cipher: Cipher, revisionDate: string | null | undefined): boolean {
  if (revisionDate === undefined || revisionDate === null) return false
  const clientTimestamp = Date.parse(revisionDate)
  const serverTimestamp = Date.parse(cipher.updatedAt)
  if (!Number.isFinite(clientTimestamp) || !Number.isFinite(serverTimestamp)) return false
  return serverTimestamp - clientTimestamp > 1000
}

export function cipherUpdate(
  database: DatabaseConnection,
  cipherUuid: string,
  userUuid: string,
  data: CipherData,
  clock: Clock,
  groupsEnabled = false,
): Result<Cipher> {
  const cipherResult = cipherFindByUuid(database, cipherUuid)
  if (!cipherResult.success) return cipherResult
  if (cipherResult.data === null) return cipherErrorCreate("cipherUpdate", "Cipher doesn't exist")
  const cipher = cipherResult.data
  const accessResult = cipherAccessFindByUser(database, cipher, userUuid, groupsEnabled)
  if (!accessResult.success) return accessResult
  if (accessResult.data === null || (accessResult.data.readOnly && !accessResult.data.manage))
    return cipherErrorCreate("cipherUpdate", "Cipher is not write accessible")
  const organizationUuid = data.organizationId ?? data.organizationID ?? null
  if (cipher.organizationUuid !== null && cipher.organizationUuid !== organizationUuid)
    return cipherErrorCreate(
      "cipherUpdate",
      "Organization mismatch. Please resync the client before updating the cipher",
    )
  if (organizationUuid !== null) {
    const membershipResult = organizationMembershipFindByUserAndOrganization(database, userUuid, organizationUuid)
    if (!membershipResult.success) return membershipResult
    if (membershipResult.data?.status !== organizationMembershipStatus.confirmed)
      return cipherErrorCreate("cipherUpdate", "You don't have permission to add item to organization")
  }
  if (cipherRevisionIsStale(cipher, data.lastKnownRevisionDate))
    return cipherErrorCreate(
      "cipherUpdate",
      "The client copy of this cipher is out of date. Resync the client and try again.",
    )
  return cipherApplyData(cipher, database, userUuid, data, clock, { groupsEnabled })
}
