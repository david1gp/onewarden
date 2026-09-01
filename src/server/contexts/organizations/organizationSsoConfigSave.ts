import type { Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { DatabaseConnection } from "../../database/database.js"
import { organizationSsoConfigs } from "../../database/schema/organizationSsoConfigs.js"
import type { OrganizationSsoConfig } from "./organizationSsoConfig.js"

export function organizationSsoConfigSave(database: DatabaseConnection, config: OrganizationSsoConfig): Result<void> {
  const op = "organizationSsoConfigSave"
  try {
    database.drizzle
      .insert(organizationSsoConfigs)
      .values({
        orgUuid: config.organizationUuid,
        enabled: config.enabled,
        data: config.data,
        creationDate: config.creationDate,
        revisionDate: config.revisionDate,
      })
      .onConflictDoUpdate({
        target: organizationSsoConfigs.orgUuid,
        set: { enabled: config.enabled, data: config.data, revisionDate: config.revisionDate },
      })
      .run()
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Organization SSO configuration save failed.")
  }
}
