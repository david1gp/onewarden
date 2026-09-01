import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { organizationApiKey } from "../../database/schema/organizationApiKey.js"
import type { IdentityOrganizationApiKey } from "./identityOrganizationApiKey.js"
import { eq } from "drizzle-orm"

export function identityOrganizationApiKeyFindByOrganizationUuid(
  database: DatabaseConnection,
  organizationUuid: string,
): Result<IdentityOrganizationApiKey | null> {
  const op = "identityOrganizationApiKeyFindByOrganizationUuid"
  try {
    const row = database.drizzle
      .select({
        uuid: organizationApiKey.uuid,
        organizationUuid: organizationApiKey.orgUuid,
        type: organizationApiKey.atype,
        apiKey: organizationApiKey.apiKey,
        revisionDate: organizationApiKey.revisionDate,
      })
      .from(organizationApiKey)
      .where(eq(organizationApiKey.orgUuid, organizationUuid))
      .limit(1)
      .get()
    return resultCreate(row ?? null)
  } catch {
    return resultErrorCreate(op, "Organization API key lookup failed.")
  }
}
