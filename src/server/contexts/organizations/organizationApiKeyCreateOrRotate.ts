import type { Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import type { DatabaseConnection } from "../../database/database.js"
import { identityApiKeyCreate } from "../identity/identityApiKeyCreate.js"
import type { IdentityOrganizationApiKey } from "../identity/identityOrganizationApiKey.js"
import { identityOrganizationApiKeyFindByOrganizationUuid } from "../identity/identityOrganizationApiKeyFindByOrganizationUuid.js"
import { identityOrganizationApiKeySave } from "../identity/identityOrganizationApiKeySave.js"

export function organizationApiKeyCreateOrRotate(
  database: DatabaseConnection,
  organizationUuid: string,
  rotate: boolean,
  clock: Clock,
  identifier: Identifier,
): Result<IdentityOrganizationApiKey> {
  return databaseTransaction(database, () => {
    const existingResult = identityOrganizationApiKeyFindByOrganizationUuid(database, organizationUuid)
    if (!existingResult.success) return existingResult
    if (existingResult.data !== null && !rotate) return resultCreate(existingResult.data)

    const apiKeyResult = identityApiKeyCreate()
    if (!apiKeyResult.success) return apiKeyResult
    const apiKey =
      existingResult.data ??
      ({
        apiKey: apiKeyResult.data,
        organizationUuid,
        revisionDate: clock.now().toISOString(),
        type: 0,
        uuid: identifier.uuid(),
      } satisfies IdentityOrganizationApiKey)
    const nextApiKey = {
      ...apiKey,
      apiKey: apiKeyResult.data,
      revisionDate: clock.now().toISOString(),
    }
    const saveResult = identityOrganizationApiKeySave(database, nextApiKey)
    if (!saveResult.success) return saveResult
    return resultCreate(nextApiKey)
  })
}
