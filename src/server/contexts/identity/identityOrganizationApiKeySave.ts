import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { organizationApiKey, type OrganizationApiKeyInsert } from "../../database/schema/organizationApiKey.js"
import type { IdentityOrganizationApiKey } from "./identityOrganizationApiKey.js"

export function identityOrganizationApiKeySave(
  database: DatabaseConnection,
  apiKey: IdentityOrganizationApiKey,
): Result<void> {
  const op = "identityOrganizationApiKeySave"
  try {
    const values: OrganizationApiKeyInsert = {
      uuid: apiKey.uuid,
      orgUuid: apiKey.organizationUuid,
      atype: apiKey.type,
      apiKey: apiKey.apiKey,
      revisionDate: apiKey.revisionDate,
    }
    database.drizzle
      .insert(organizationApiKey)
      .values(values)
      .onConflictDoUpdate({
        target: [organizationApiKey.uuid, organizationApiKey.orgUuid],
        set: {
          atype: values.atype,
          apiKey: values.apiKey,
          revisionDate: values.revisionDate,
        },
      })
      .run()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Organization API key save failed.")
  }
}
