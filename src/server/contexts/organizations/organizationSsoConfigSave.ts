import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { OrganizationSsoConfig } from "./organizationSsoConfig.js"

export function organizationSsoConfigSave(database: DatabaseConnection, config: OrganizationSsoConfig): Result<void> {
  const op = "organizationSsoConfigSave"
  try {
    database.run(
      `INSERT INTO organization_sso_configs (org_uuid, enabled, data, creation_date, revision_date)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(org_uuid) DO UPDATE SET
         enabled = excluded.enabled,
         data = excluded.data,
         revision_date = excluded.revision_date`,
      [config.organizationUuid, config.enabled ? 1 : 0, config.data, config.creationDate, config.revisionDate],
    )
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Organization SSO configuration save failed.")
  }
}
