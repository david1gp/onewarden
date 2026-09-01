import { index, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { organizations } from "./organizations.js"

export const ssoAuth = sqliteTable(
  "sso_auth",
  {
    state: text("state").notNull().primaryKey(),
    clientChallenge: text("client_challenge").notNull(),
    nonce: text("nonce").notNull(),
    redirectUri: text("redirect_uri").notNull(),
    codeResponse: text("code_response"),
    codeResponseError: text("code_response_error"),
    authResponse: text("auth_response"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    bindingHash: text("binding_hash"),
    organizationUuid: text("organization_uuid").references(() => organizations.uuid),
  },
  (table) => [index("sso_auth_created_at_index").on(table.createdAt)],
)

export type SsoAuthRow = typeof ssoAuth.$inferSelect
export type SsoAuthInsert = typeof ssoAuth.$inferInsert
