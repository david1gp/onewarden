import type { Context, Hono } from "hono"
import * as v from "valibot"
import { and, count, eq, isNotNull, sql } from "drizzle-orm"
import { apiErrorResponseCreate } from "../../../shared/api/apiErrorResponseCreate.js"
import { requestBodyParse } from "../../../shared/validation/requestBodyParse.js"
import { requestPathParse } from "../../../shared/validation/requestPathParse.js"
import type { AuthenticationEnvironment } from "../authentication/authenticationEnvironment.js"
import { authenticationMiddleware } from "../authentication/authenticationMiddleware.js"
import { organizationAdminMiddleware } from "./organizationAdminMiddleware.js"
import { organizationDomainCreate } from "./organizationDomainCreate.js"
import { organizationDomainDelete } from "./organizationDomainDelete.js"
import { organizationDomainDnsResolve } from "./organizationDomainDnsResolve.js"
import { organizationDomainFindByOrganization } from "./organizationDomainFindByOrganization.js"
import { organizationDomainFindByUuidAndOrganization } from "./organizationDomainFindByUuidAndOrganization.js"
import { organizationDomainFindVerifiedByEmail } from "./organizationDomainFindVerifiedByEmail.js"
import { organizationDomainRequestSchema } from "./organizationDomainRequestSchema.js"
import { organizationDomainSave } from "./organizationDomainSave.js"
import { organizationDomainSsoDetailsRequestSchema } from "./organizationDomainSsoDetailsRequestSchema.js"
import { organizationDomainToJson } from "./organizationDomainToJson.js"
import { organizationDomainVerify } from "./organizationDomainVerify.js"
import { organizationErrorCreate } from "./organizationErrorCreate.js"
import type { OrganizationRouteOptions } from "./organizationRouteOptions.js"
import { organizationDomains } from "../../database/schema/organizationDomains.js"

const organizationDomainPathSchema = v.object({ id: v.string() })

export function organizationDomainRoutesRegister(
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
  const organizationResolve = (context: Context<AuthenticationEnvironment>) => context.get("organizationId")

  const list = (context: Context<AuthenticationEnvironment>) => {
    const database = databaseResolve(context)
    const organizationUuid = organizationResolve(context)
    if (database === undefined)
      return apiErrorResponseCreate(organizationErrorCreate("organizationDomainRoutesList", "Database unavailable."))
    if (organizationUuid === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationDomainRoutesList", "Organization not found", 404),
      )
    const result = organizationDomainFindByOrganization(database, organizationUuid)
    if (!result.success) return apiErrorResponseCreate(result)
    return context.json({
      data: result.data.map(organizationDomainToJson),
      continuationToken: null,
      object: "list" as const,
    })
  }

  const get = (context: Context<AuthenticationEnvironment>) => {
    const database = databaseResolve(context)
    const organizationUuid = organizationResolve(context)
    if (database === undefined)
      return apiErrorResponseCreate(organizationErrorCreate("organizationDomainRoutesGet", "Database unavailable."))
    if (organizationUuid === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationDomainRoutesGet", "Organization not found", 404),
      )
    const pathResult = requestPathParse(context, organizationDomainPathSchema)
    if (!pathResult.success) return apiErrorResponseCreate(pathResult)
    const result = organizationDomainFindByUuidAndOrganization(database, pathResult.data.id, organizationUuid)
    if (!result.success) return apiErrorResponseCreate(result)
    if (result.data === null)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationDomainRoutesGet", "Organization domain not found", 404),
      )
    return context.json(organizationDomainToJson(result.data))
  }

  const create = async (context: Context<AuthenticationEnvironment>) => {
    const database = databaseResolve(context)
    const organizationUuid = organizationResolve(context)
    if (database === undefined)
      return apiErrorResponseCreate(organizationErrorCreate("organizationDomainRoutesCreate", "Database unavailable."))
    if (organizationUuid === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationDomainRoutesCreate", "Organization not found", 404),
      )
    const bodyResult = await requestBodyParse(context, organizationDomainRequestSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const normalizedDomain = bodyResult.data.domainName.toLowerCase()
    const claimed = database.drizzle
      .select({ count: count() })
      .from(organizationDomains)
      .where(
        and(
          sql`lower(${organizationDomains.domainName}) = lower(${normalizedDomain})`,
          isNotNull(organizationDomains.verifiedDate),
        ),
      )
      .get()
    if ((claimed?.count ?? 0) > 0)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationDomainRoutesCreate", "The domain is not available to be claimed.", 409),
      )
    const duplicate = database.drizzle
      .select({ count: count() })
      .from(organizationDomains)
      .where(
        and(
          eq(organizationDomains.orgUuid, organizationUuid),
          sql`lower(${organizationDomains.domainName}) = lower(${normalizedDomain})`,
        ),
      )
      .get()
    if ((duplicate?.count ?? 0) > 0)
      return apiErrorResponseCreate(
        organizationErrorCreate(
          "organizationDomainRoutesCreate",
          "A domain already exists for this organization vault.",
          409,
        ),
      )
    const domainResult = organizationDomainCreate(organizationUuid, normalizedDomain, options.clock, options.identifier)
    if (!domainResult.success) return apiErrorResponseCreate(domainResult)
    const saveResult = organizationDomainSave(database, domainResult.data)
    if (!saveResult.success) return apiErrorResponseCreate(saveResult)
    return context.json(organizationDomainToJson(domainResult.data))
  }

  const verify = async (context: Context<AuthenticationEnvironment>) => {
    const database = databaseResolve(context)
    const organizationUuid = organizationResolve(context)
    if (database === undefined)
      return apiErrorResponseCreate(organizationErrorCreate("organizationDomainRoutesVerify", "Database unavailable."))
    if (organizationUuid === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationDomainRoutesVerify", "Organization not found", 404),
      )
    const pathResult = requestPathParse(context, organizationDomainPathSchema)
    if (!pathResult.success) return apiErrorResponseCreate(pathResult)
    const domainResult = organizationDomainFindByUuidAndOrganization(database, pathResult.data.id, organizationUuid)
    if (!domainResult.success) return apiErrorResponseCreate(domainResult)
    if (domainResult.data === null)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationDomainRoutesVerify", "Organization domain not found", 404),
      )
    const verifyResult = await organizationDomainVerify(
      database,
      domainResult.data,
      options.clock,
      options.identifier,
      options.domainDnsResolve ?? organizationDomainDnsResolve,
    )
    if (!verifyResult.success) return apiErrorResponseCreate(verifyResult)
    return context.json(organizationDomainToJson(verifyResult.data))
  }

  const remove = (context: Context<AuthenticationEnvironment>) => {
    const database = databaseResolve(context)
    const organizationUuid = organizationResolve(context)
    if (database === undefined)
      return apiErrorResponseCreate(organizationErrorCreate("organizationDomainRoutesDelete", "Database unavailable."))
    if (organizationUuid === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationDomainRoutesDelete", "Organization not found", 404),
      )
    const pathResult = requestPathParse(context, organizationDomainPathSchema)
    if (!pathResult.success) return apiErrorResponseCreate(pathResult)
    const domainResult = organizationDomainFindByUuidAndOrganization(database, pathResult.data.id, organizationUuid)
    if (!domainResult.success) return apiErrorResponseCreate(domainResult)
    if (domainResult.data === null)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationDomainRoutesDelete", "Organization domain not found", 404),
      )
    const result = organizationDomainDelete(database, pathResult.data.id, organizationUuid)
    if (!result.success) return apiErrorResponseCreate(result)
    return new Response(null, { status: 200 })
  }

  const verifiedSsoDetails = async (context: Context<AuthenticationEnvironment>) => {
    const database = databaseResolve(context)
    if (database === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationDomainRoutesVerifiedSsoDetails", "Database unavailable."),
      )
    const bodyResult = await requestBodyParse(context, organizationDomainSsoDetailsRequestSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const result = organizationDomainFindVerifiedByEmail(database, bodyResult.data.email)
    if (!result.success) return apiErrorResponseCreate(result)
    return context.json({
      data: result.data.map((detail) => ({ ...detail, object: "verifiedOrganizationDomainSsoDetails" })),
      continuationToken: null,
      object: "list" as const,
    })
  }

  app.get("/api/organizations/:org_id/domain", authenticate("get_organization_domains"), admin, list)
  app.get("/api/organizations/:org_id/domain/:id", authenticate("get_organization_domain"), admin, get)
  app.post("/api/organizations/:org_id/domain", authenticate("post_organization_domain"), admin, create)
  app.post("/api/organizations/:org_id/domain/:id/verify", authenticate("verify_organization_domain"), admin, verify)
  app.delete("/api/organizations/:org_id/domain/:id", authenticate("delete_organization_domain"), admin, remove)
  app.post(
    "/api/organizations/:org_id/domain/:id/remove",
    authenticate("post_remove_organization_domain"),
    admin,
    remove,
  )
  app.post("/api/organizations/domain/sso/verified", verifiedSsoDetails)
}
