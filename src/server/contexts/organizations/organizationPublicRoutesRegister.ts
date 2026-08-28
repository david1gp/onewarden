import type { Context, Hono } from "hono"
import { apiErrorCreate } from "../../../shared/api/apiErrorCreate.js"
import { apiErrorResponseCreate } from "../../../shared/api/apiErrorResponseCreate.js"
import { requestBodyParse } from "../../../shared/validation/requestBodyParse.js"
import type { AuthenticationEnvironment } from "../authentication/authenticationEnvironment.js"
import { authenticationGuardErrorCreate } from "../authentication/authenticationGuardErrorCreate.js"
import { authenticationMiddleware } from "../authentication/authenticationMiddleware.js"
import { organizationAdminMiddleware } from "./organizationAdminMiddleware.js"
import { organizationMemberMiddleware } from "./organizationMemberMiddleware.js"
import { organizationPublicImport } from "./organizationPublicImport.js"
import { organizationPublicImportDataSchema } from "./organizationPublicImportDataSchema.js"
import { organizationPublicKeyGet } from "./organizationPublicKeyGet.js"
import { organizationPublicKeysBulkGet } from "./organizationPublicKeysBulkGet.js"
import { organizationPublicMembershipIdsSchema } from "./organizationPublicMembershipIdsSchema.js"
import type { OrganizationPublicRouteOptions } from "./organizationPublicRouteOptions.js"
import { organizationPublicTokenResolve } from "./organizationPublicTokenResolve.js"

export function organizationPublicRoutesRegister(
  app: Hono<AuthenticationEnvironment>,
  options: OrganizationPublicRouteOptions,
): void {
  const authenticate = (routeName: string) =>
    authenticationMiddleware({
      clock: options.clock,
      database: options.database,
      publicKey: options.publicKey,
      publicOrigin: options.publicOrigin,
      routeName,
    })
  const organizationAuthentication = {
    clock: options.clock,
    database: options.database,
    publicKey: options.publicKey,
    publicOrigin: options.publicOrigin,
  }

  const bulkPublicKeys = async (context: Context<AuthenticationEnvironment>) => {
    const database = options.database ?? context.get("database")
    if (database === undefined)
      return apiErrorResponseCreate(authenticationGuardErrorCreate("organizationPublicKeysBulkGet", "Error getting DB"))
    const organizationUuid = context.get("organizationId")
    if (organizationUuid === undefined)
      return apiErrorResponseCreate(
        authenticationGuardErrorCreate("organizationPublicKeysBulkGet", "Error getting the organization id"),
      )
    const bodyResult = await requestBodyParse(context, organizationPublicMembershipIdsSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const result = organizationPublicKeysBulkGet(database, organizationUuid, bodyResult.data.ids)
    if (!result.success) return apiErrorResponseCreate(result)
    return context.json({ data: result.data, object: "list" as const, continuationToken: null })
  }

  const publicKey = (context: Context<AuthenticationEnvironment>) => {
    const database = options.database ?? context.get("database")
    if (database === undefined)
      return apiErrorResponseCreate(authenticationGuardErrorCreate("organizationPublicKeyGet", "Error getting DB"))
    const organizationUuid = context.get("organizationId")
    if (organizationUuid === undefined)
      return apiErrorResponseCreate(
        authenticationGuardErrorCreate("organizationPublicKeyGet", "Error getting the organization id"),
      )
    const result = organizationPublicKeyGet(database, organizationUuid)
    if (!result.success) return apiErrorResponseCreate(result)
    if (result.data === null)
      return apiErrorResponseCreate(
        apiErrorCreate("organizationPublicKeyGet", "platform.invalid-request", "Organization not found"),
      )
    return context.json({ object: "organizationPublicKey" as const, publicKey: result.data.publicKey })
  }

  app.post(
    "/api/organizations/:org_id/users/public-keys",
    authenticate("bulk_public_keys"),
    organizationAdminMiddleware(organizationAuthentication),
    bulkPublicKeys,
  )
  app.get(
    "/api/organizations/:org_id/public-key",
    authenticate("get_organization_public_key"),
    organizationMemberMiddleware(organizationAuthentication),
    publicKey,
  )
  app.get(
    "/api/organizations/:org_id/keys",
    authenticate("get_organization_keys"),
    organizationMemberMiddleware(organizationAuthentication),
    publicKey,
  )

  app.post("/api/public/organization/import", async (context) => {
    const organizationResult = await organizationPublicTokenResolve(context, options)
    if (!organizationResult.success) return apiErrorResponseCreate(organizationResult)
    const database = options.database ?? context.get("database")
    if (database === undefined)
      return apiErrorResponseCreate(authenticationGuardErrorCreate("organizationPublicImport", "Error getting DB"))
    const bodyResult = await requestBodyParse(context, organizationPublicImportDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const result = await organizationPublicImport(bodyResult.data, {
      clock: options.clock,
      config: options.config,
      database,
      groupsEnabled: options.groupsEnabled,
      identifier: options.identifier,
      mail: options.mail,
      organizationUuid: organizationResult.data,
    })
    if (!result.success) return apiErrorResponseCreate(result)
    return new Response(null, { status: 200 })
  })
}
