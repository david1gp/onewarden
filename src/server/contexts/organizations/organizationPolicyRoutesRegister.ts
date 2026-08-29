import type { Context, Hono } from "hono"
import { apiErrorResponseCreate } from "../../../shared/api/apiErrorResponseCreate.js"
import { requestBodyParse } from "../../../shared/validation/requestBodyParse.js"
import { requestPathParse } from "../../../shared/validation/requestPathParse.js"
import type { AuthenticationEnvironment } from "../authentication/authenticationEnvironment.js"
import { authenticationMiddleware } from "../authentication/authenticationMiddleware.js"
import { identityOriginResolve } from "../identity/identityOriginResolve.js"
import { organizationMembershipFindByUserAndOrganization } from "./organizationMembershipFindByUserAndOrganization.js"
import { organizationAdminMiddleware } from "./organizationAdminMiddleware.js"
import { organizationErrorCreate } from "./organizationErrorCreate.js"
import { organizationMemberMiddleware } from "./organizationMemberMiddleware.js"
import { organizationPolicyCreate } from "./organizationPolicyCreate.js"
import { organizationPolicyFindByOrganization } from "./organizationPolicyFindByOrganization.js"
import { organizationPolicyFindByOrganizationAndType } from "./organizationPolicyFindByOrganizationAndType.js"
import { organizationPolicyInviteTokenDecode } from "./organizationPolicyInviteTokenDecode.js"
import { organizationPolicyPathSchema } from "./organizationPolicyPathSchema.js"
import type { OrganizationRouteOptions } from "./organizationRouteOptions.js"
import { organizationPolicyPutDataSchema } from "./organizationPolicyPutDataSchema.js"
import { organizationPolicySave } from "./organizationPolicySave.js"
import { organizationPolicyToJson } from "./organizationPolicyToJson.js"
import { organizationPolicyType } from "./organizationPolicyType.js"
import { organizationPolicyTypeResolve } from "./organizationPolicyTypeResolve.js"

const fakeAdminOrganizationUuid = "00000000-0000-0000-0000-000000000000"
const fakeSsoOrganizationUuid = "00000000-01DC-01DC-01DC-000000000000"

export function organizationPolicyRoutesRegister(
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
  const organizationAuthentication = {
    clock: options.clock,
    database: options.database,
    publicKey: options.publicKey,
    publicOrigin: options.publicOrigin,
  }
  const admin = organizationAdminMiddleware(organizationAuthentication)
  const member = organizationMemberMiddleware(organizationAuthentication)

  const list = (context: Context<AuthenticationEnvironment>) => {
    const database = organizationPolicyDatabaseResolve(context, options)
    if (database === undefined)
      return apiErrorResponseCreate(organizationErrorCreate("organizationPolicyRoutesList", "Database unavailable."))
    const organizationUuid = context.get("organizationId")
    if (organizationUuid === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationPolicyRoutesList", "Organization not found", 404),
      )
    const result = organizationPolicyFindByOrganization(database, organizationUuid)
    if (!result.success) return apiErrorResponseCreate(result)
    return context.json(organizationPolicyListToJson(result.data))
  }

  const listByToken = async (context: Context<AuthenticationEnvironment>) => {
    const token = context.req.query("token")
    if (token === undefined)
      return apiErrorResponseCreate(organizationErrorCreate("organizationPolicyRoutesListByToken", "Token is invalid"))
    const tokenResult = await organizationPolicyInviteTokenDecode(
      token,
      identityOriginResolve(options.publicOrigin, context.req.url),
      options.publicKey,
      options.clock,
    )
    if (!tokenResult.success) return apiErrorResponseCreate(tokenResult)
    const pathOrganizationUuid = context.req.param("org_id")
    if (tokenResult.data.organizationUuid !== pathOrganizationUuid)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationPolicyRoutesListByToken", "Token doesn't match request organization"),
      )
    if (pathOrganizationUuid === fakeAdminOrganizationUuid) return context.json({})
    const database = organizationPolicyDatabaseResolve(context, options)
    if (database === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationPolicyRoutesListByToken", "Database unavailable."),
      )
    const membershipResult = organizationMembershipFindByUserAndOrganization(
      database,
      tokenResult.data.userUuid,
      tokenResult.data.organizationUuid,
    )
    if (!membershipResult.success) return apiErrorResponseCreate(membershipResult)
    if (membershipResult.data === null || membershipResult.data.uuid !== tokenResult.data.memberUuid)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationPolicyRoutesListByToken", "Token doesn't match organization member"),
      )
    const result = organizationPolicyFindByOrganization(database, pathOrganizationUuid)
    if (!result.success) return apiErrorResponseCreate(result)
    return context.json(organizationPolicyListToJson(result.data.filter((policy) => policy.enabled)))
  }

  const getDummyMasterPassword = (context: Context<AuthenticationEnvironment>) =>
    context.json(
      organizationPolicyToJson(
        organizationPolicyCreate(
          fakeSsoOrganizationUuid,
          organizationPolicyType.masterPassword,
          options.identifier,
          false,
          "null",
          options.clock.now().toISOString(),
        ),
      ),
    )

  const getMasterPassword = (context: Context<AuthenticationEnvironment>) => {
    const database = organizationPolicyDatabaseResolve(context, options)
    if (database === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationPolicyRoutesGetMasterPassword", "Database unavailable."),
      )
    const organizationUuid = context.get("organizationId")
    if (organizationUuid === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationPolicyRoutesGetMasterPassword", "Organization not found", 404),
      )
    const result = organizationPolicyFindByOrganizationAndType(
      database,
      organizationUuid,
      organizationPolicyType.masterPassword,
    )
    if (!result.success) return apiErrorResponseCreate(result)
    const policy =
      result.data ??
      organizationPolicyCreate(
        organizationUuid,
        organizationPolicyType.masterPassword,
        options.identifier,
        false,
        "null",
        options.clock.now().toISOString(),
      )
    return context.json(organizationPolicyToJson(policy))
  }

  const get = (context: Context<AuthenticationEnvironment>) => {
    const database = organizationPolicyDatabaseResolve(context, options)
    if (database === undefined)
      return apiErrorResponseCreate(organizationErrorCreate("organizationPolicyRoutesGet", "Database unavailable."))
    const organizationUuid = context.get("organizationId")
    if (organizationUuid === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationPolicyRoutesGet", "Organization not found", 404),
      )
    const pathResult = requestPathParse(context, organizationPolicyPathSchema)
    if (!pathResult.success) return apiErrorResponseCreate(pathResult)
    const policyType = organizationPolicyTypeResolve(pathResult.data.pol_type)
    if (policyType === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationPolicyRoutesGet", "Invalid or unsupported policy type"),
      )
    const result = organizationPolicyFindByOrganizationAndType(database, organizationUuid, policyType)
    if (!result.success) return apiErrorResponseCreate(result)
    const policy =
      result.data ??
      organizationPolicyCreate(
        organizationUuid,
        policyType,
        options.identifier,
        false,
        "null",
        options.clock.now().toISOString(),
      )
    return context.json(organizationPolicyToJson(policy))
  }

  const put = async (context: Context<AuthenticationEnvironment>) => {
    const database = organizationPolicyDatabaseResolve(context, options)
    if (database === undefined)
      return apiErrorResponseCreate(organizationErrorCreate("organizationPolicyRoutesPut", "Database unavailable."))
    const organizationUuid = context.get("organizationId")
    if (organizationUuid === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationPolicyRoutesPut", "Organization not found", 404),
      )
    const pathResult = requestPathParse(context, organizationPolicyPathSchema)
    if (!pathResult.success) return apiErrorResponseCreate(pathResult)
    const policyType = organizationPolicyTypeResolve(pathResult.data.pol_type)
    if (policyType === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationPolicyRoutesPut", "Invalid or unsupported policy type"),
      )
    const bodyResult = await requestBodyParse(context, organizationPolicyPutDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const existingResult = organizationPolicyFindByOrganizationAndType(database, organizationUuid, policyType)
    if (!existingResult.success) return apiErrorResponseCreate(existingResult)
    const policy =
      existingResult.data ??
      organizationPolicyCreate(
        organizationUuid,
        policyType,
        options.identifier,
        false,
        "null",
        options.clock.now().toISOString(),
      )
    const nextPolicy = {
      ...policy,
      data: JSON.stringify(bodyResult.data.policy.data ?? null),
      enabled: bodyResult.data.policy.enabled,
      revisionDate: options.clock.now().toISOString(),
    }
    const saveResult = organizationPolicySave(database, nextPolicy)
    if (!saveResult.success) return apiErrorResponseCreate(saveResult)
    return context.json(organizationPolicyToJson(nextPolicy))
  }

  app.get("/api/organizations/:org_id/policies", authenticate("list_policies"), admin, list)
  app.get("/api/organizations/:org_id/policies/token", listByToken)
  app.get("/api/organizations/00000000-01DC-01DC-01DC-000000000000/policies/master-password", getDummyMasterPassword)
  app.get(
    "/api/organizations/:org_id/policies/master-password",
    authenticate("get_master_password_policy"),
    member,
    getMasterPassword,
  )
  app.get("/api/organizations/:org_id/policies/:pol_type", authenticate("get_policy"), admin, get)
  app.put("/api/organizations/:org_id/policies/:pol_type", authenticate("put_policy"), admin, put)
  app.put("/api/organizations/:org_id/policies/:pol_type/vnext", authenticate("put_policy_vnext"), admin, put)
}

function organizationPolicyDatabaseResolve(
  context: Context<AuthenticationEnvironment>,
  options: OrganizationRouteOptions,
): OrganizationRouteOptions["database"] {
  return options.database ?? context.get("database")
}

function organizationPolicyListToJson(policies: readonly import("./organizationPolicy.js").OrganizationPolicy[]) {
  return {
    data: policies.map(organizationPolicyToJson),
    object: "list" as const,
    continuationToken: null,
  }
}
