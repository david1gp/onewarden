import type { Context, Hono } from "hono"
import { apiErrorResponseCreate } from "../../../shared/api/apiErrorResponseCreate.js"
import { requestBodyParse } from "../../../shared/validation/requestBodyParse.js"
import type { AuthenticationEnvironment } from "../authentication/authenticationEnvironment.js"
import { authenticationMiddleware } from "../authentication/authenticationMiddleware.js"
import { organizationAdminMiddleware } from "./organizationAdminMiddleware.js"
import { organizationErrorCreate } from "./organizationErrorCreate.js"
import { organizationFindByUuid } from "./organizationFindByUuid.js"
import { organizationSave } from "./organizationSave.js"
import type { OrganizationRouteOptions } from "./organizationRouteOptions.js"
import { organizationSsoConfigCreate } from "./organizationSsoConfigCreate.js"
import { organizationSsoConfigFindByOrganization } from "./organizationSsoConfigFindByOrganization.js"
import { organizationSsoConfigSave } from "./organizationSsoConfigSave.js"
import { organizationSsoRequestSchema } from "./organizationSsoRequestSchema.js"
import { organizationSsoToJson } from "./organizationSsoToJson.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"

export function organizationSsoRoutesRegister(
  app: Hono<AuthenticationEnvironment>,
  options: OrganizationRouteOptions,
): void {
  const authenticate = (routeName: string) =>
    authenticationMiddleware({
      clock: options.clock,
      database: options.database,
      publicKey: options.publicKey,
      publicOrigin: options.publicOrigin,
      routeName,
    })
  const admin = organizationAdminMiddleware({
    clock: options.clock,
    database: options.database,
    publicKey: options.publicKey,
    publicOrigin: options.publicOrigin,
  })
  const databaseResolve = (context: Context<AuthenticationEnvironment>) => options.database ?? context.get("database")

  const get = (context: Context<AuthenticationEnvironment>) => {
    const database = databaseResolve(context)
    const organizationUuid = context.get("organizationId")
    if (database === undefined)
      return apiErrorResponseCreate(organizationErrorCreate("organizationSsoRoutesGet", "Database unavailable."))
    if (organizationUuid === undefined)
      return apiErrorResponseCreate(organizationErrorCreate("organizationSsoRoutesGet", "Organization not found", 404))
    const organizationResult = organizationFindByUuid(database, organizationUuid)
    if (!organizationResult.success) return apiErrorResponseCreate(organizationResult)
    if (organizationResult.data === null)
      return apiErrorResponseCreate(organizationErrorCreate("organizationSsoRoutesGet", "Organization not found", 404))
    const configResult = organizationSsoConfigFindByOrganization(database, organizationUuid)
    if (!configResult.success) return apiErrorResponseCreate(configResult)
    return context.json(organizationSsoToJson(organizationResult.data, configResult.data, options.publicOrigin))
  }

  const save = async (context: Context<AuthenticationEnvironment>) => {
    const database = databaseResolve(context)
    const organizationUuid = context.get("organizationId")
    if (database === undefined)
      return apiErrorResponseCreate(organizationErrorCreate("organizationSsoRoutesPost", "Database unavailable."))
    if (organizationUuid === undefined)
      return apiErrorResponseCreate(organizationErrorCreate("organizationSsoRoutesPost", "Organization not found", 404))
    const bodyResult = await requestBodyParse(context, organizationSsoRequestSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const organizationResult = organizationFindByUuid(database, organizationUuid)
    if (!organizationResult.success) return apiErrorResponseCreate(organizationResult)
    if (organizationResult.data === null)
      return apiErrorResponseCreate(organizationErrorCreate("organizationSsoRoutesPost", "Organization not found", 404))
    const identifier = bodyResult.data.identifier?.trim() ?? ""
    if (identifier !== "") {
      const duplicate = database
        .query<{ count: number }, [string, string]>(
          "SELECT COUNT(*) AS count FROM organizations WHERE identifier = ? AND uuid <> ?",
        )
        .get(identifier, organizationUuid)
      if ((duplicate?.count ?? 0) > 0)
        return apiErrorResponseCreate(
          organizationErrorCreate(
            "organizationSsoRoutesPost",
            "The organization SSO identifier is already in use.",
            409,
          ),
        )
    }
    const configResult = organizationSsoConfigFindByOrganization(database, organizationUuid)
    if (!configResult.success) return apiErrorResponseCreate(configResult)
    const now = options.clock.now().toISOString()
    const config =
      configResult.data === null
        ? organizationSsoConfigCreate(
            organizationUuid,
            bodyResult.data.enabled,
            JSON.stringify(bodyResult.data.data),
            options.clock,
          )
        : {
            ...configResult.data,
            data: JSON.stringify(bodyResult.data.data),
            enabled: bodyResult.data.enabled,
            revisionDate: now,
          }
    const nextOrganization = { ...organizationResult.data, identifier: identifier || null }
    const saveResult = databaseTransaction(database, () => {
      const organizationSaveResult = organizationSave(database, nextOrganization, now)
      if (!organizationSaveResult.success) return organizationSaveResult
      return organizationSsoConfigSave(database, config)
    })
    if (!saveResult.success) return apiErrorResponseCreate(saveResult)
    return context.json(organizationSsoToJson(nextOrganization, config, options.publicOrigin))
  }

  app.get("/api/organizations/:org_id/sso", authenticate("get_sso"), admin, get)
  app.post("/api/organizations/:org_id/sso", authenticate("post_sso"), admin, save)
}
