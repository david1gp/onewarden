import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityOrganizationApiKey } from "./identityOrganizationApiKey.js"

export function identityOrganizationApiKeySave(
  database: DatabaseConnection,
  apiKey: IdentityOrganizationApiKey,
): Result<void> {
  const op = "identityOrganizationApiKeySave"
  try {
    database.run(
      `INSERT INTO organization_api_key (uuid, org_uuid, atype, api_key, revision_date)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(uuid, org_uuid) DO UPDATE SET
         atype = excluded.atype,
         api_key = excluded.api_key,
         revision_date = excluded.revision_date`,
      [apiKey.uuid, apiKey.organizationUuid, apiKey.type, apiKey.apiKey, apiKey.revisionDate],
    )
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Organization API key save failed.")
  }
}
