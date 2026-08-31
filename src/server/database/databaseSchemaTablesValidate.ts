import type { Database } from "bun:sqlite"
import { type Result } from "#result"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"

const databaseCurrentSchemaTables = [
  "schema_version",
  "users",
  "invitations",
  "identity_signing_keys",
  "devices",
  "organization_api_key",
  "sso_auth",
  "sso_users",
  "organizations",
  "org_policies",
  "organization_domains",
  "organization_sso_configs",
  "users_organizations",
  "collections",
  "users_collections",
  "groups",
  "groups_users",
  "collections_groups",
  "folders",
  "folders_ciphers",
  "ciphers",
  "ciphers_collections",
  "favorites",
  "archives",
  "sends",
  "send_recipient_verifications",
  "extension_session_handoffs",
  "emergency_access",
  "attachments",
  "event",
  "auth_requests",
]

export function databaseSchemaTablesValidate(database: Database): Result<void> {
  const op = "databaseSchemaTablesValidate"
  try {
    const tableNames = new Set(
      database
        .query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type = 'table'")
        .all()
        .map((row) => row.name),
    )
    if (databaseCurrentSchemaTables.some((tableName) => !tableNames.has(tableName)))
      return resultErrorCreate(op, "Database schema is incomplete.")
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Database schema could not be inspected.")
  }
}
