import type { Context, Hono } from "hono"
import * as v from "valibot"
import { type Result, type ResultErr } from "#result"
import { apiErrorResponseCreate } from "../../../shared/api/apiErrorResponseCreate.js"
import { secureRandomBytes } from "../../../shared/crypto/secureRandomBytes.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { requestBodyParse } from "../../../shared/validation/requestBodyParse.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import type { IdentityConfig } from "../identity/identityConfigSchema.js"
import { identityDeviceDeleteAllByUser } from "../identity/identityDeviceDeleteAllByUser.js"
import { identityDeviceFindByUser } from "../identity/identityDeviceFindByUser.js"
import type { IdentityUser } from "../identity/identityUser.js"
import { identityUserFromRow } from "../identity/identityUserFromRow.js"
import type { IdentityUserRow } from "../identity/identityUserRow.js"
import { identityUserSave } from "../identity/identityUserSave.js"
import type { AdminBackupAdapter } from "./adminBackupAdapter.js"
import { adminBackupAdapterCreate } from "./adminBackupAdapterCreate.js"
import type { AdminConfigurationAdapter } from "./adminConfigurationAdapter.js"
import { adminConfigurationAdapterCreate } from "./adminConfigurationAdapterCreate.js"
import { adminCookieValueResolve } from "./adminCookieValueResolve.js"
import type { AdminDiagnosticsAdapter } from "./adminDiagnosticsAdapter.js"
import { adminDiagnosticsAdapterCreate } from "./adminDiagnosticsAdapterCreate.js"
import { adminIssuerResolve } from "./adminIssuerResolve.js"
import { adminOrganizationJsonCreate } from "./adminOrganizationJsonCreate.js"
import type { AdminRouteOptions } from "./adminRouteOptions.js"
import { adminSessionTokenCreate } from "./adminSessionTokenCreate.js"
import { adminSessionTokenVerify } from "./adminSessionTokenVerify.js"
import { adminTokenValidate } from "./adminTokenValidate.js"
import { adminUserJsonCreate } from "./adminUserJsonCreate.js"

const adminInviteDataSchema = v.object({
  email: v.pipe(v.string(), v.trim(), v.email()),
})

const adminMembershipTypeDataSchema = v.object({
  user_type: v.union([v.number(), v.string()]),
  user_uuid: v.string(),
  org_uuid: v.string(),
})

const adminConfigurationDataSchema = v.record(v.string(), v.unknown())

type AdminHandler = (context: Context<any>) => Response | Promise<Response>

const adminFakeUuid = "00000000-0000-0000-0000-000000000000"
const adminFakeSsoIdentifier = "00000000-01DC-01DC-01DC-000000000000"

type AdminOrganizationRow = {
  uuid: string
  name: string
  billing_email: string
  private_key: string | null
  public_key: string | null
}

export function adminRoutesRegister(app: Hono<any>, suppliedOptions: AdminRouteOptions): void {
  const options = adminRouteOptionsNormalize(suppliedOptions)
  const enabled = options.config.DISABLE_ADMIN_TOKEN || (options.config.ADMIN_TOKEN?.trim() ?? "") !== ""

  if (!enabled) {
    app.get(
      "/admin/",
      () =>
        new Response("The admin panel is disabled, please configure the 'ADMIN_TOKEN' variable to enable it", {
          headers: { "content-type": "text/plain; charset=UTF-8" },
        }),
    )
    return
  }

  const root = async (context: Context<any>): Promise<Response> => {
    if (options.config.DISABLE_ADMIN_TOKEN) return adminSettingsResponse(options)
    const authentication = await adminAuthenticationResolve(context, options)
    if (!authentication.success) {
      if (adminCookieValueResolve(context.req.header("cookie")) === undefined)
        return adminHtmlResponse("admin/login", { error: null })
      return adminLoginResponse(undefined, authentication, context, 401)
    }
    return adminSettingsResponse(options)
  }

  const login = async (context: Context<any>): Promise<Response> => {
    let body: Record<string, unknown>
    try {
      body = (await context.req.parseBody()) as Record<string, unknown>
    } catch {
      return adminLoginResponse("Invalid admin token, please try again.", undefined, context, 401)
    }
    const token = typeof body.token === "string" ? body.token : ""
    const validResult = await adminTokenValidate(token, options.config.ADMIN_TOKEN)
    if (!validResult.success || !validResult.data)
      return adminLoginResponse(
        "Invalid admin token, please try again.",
        validResult.success ? undefined : validResult,
        context,
        401,
      )
    const sessionResult = await adminSessionTokenCreate(
      adminIssuerResolve(options.publicOrigin, context.req.url),
      options.privateKey,
      options.clock,
      options.config.ADMIN_SESSION_LIFETIME,
    )
    if (!sessionResult.success) return apiErrorResponseCreate(sessionResult)
    const cookie = adminCookieCreate(
      sessionResult.data,
      adminCookieSecure(context),
      options.config.ADMIN_SESSION_LIFETIME,
    )
    const redirect = typeof body.redirect === "string" ? body.redirect.trim().replace(/^\/+/, "") : ""
    if (redirect.length > 0)
      return new Response(null, { headers: { location: `/admin/${redirect}`, "set-cookie": cookie }, status: 303 })
    return adminSettingsResponse(options, cookie)
  }

  const invite = async (context: Context<any>): Promise<Response> => {
    const databaseResult = adminDatabaseRequire(context, options)
    if (!databaseResult.success) return apiErrorResponseCreate(databaseResult)
    const bodyResult = await requestBodyParse(context, adminInviteDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const email = bodyResult.data.email.toLowerCase()
    const existingResult = adminUserFindByEmail(databaseResult.data, email)
    if (!existingResult.success) return apiErrorResponseCreate(existingResult)
    if (existingResult.data !== null)
      return apiErrorResponseCreate(adminError("adminInviteUser", "User already exists", "platform.conflict"))

    const userResult = adminPendingUserCreate(email, options)
    if (!userResult.success) return apiErrorResponseCreate(userResult)
    if (options.identityConfig.MAIL_ENABLED) {
      if (options.mail.sendInvite !== undefined) {
        const mailResult = await options.mail.sendInvite(
          email,
          options.config.INVITATION_ORG_NAME,
          adminInviteOrganizationId(options.identityConfig),
        )
        if (!mailResult.success) return apiErrorResponseCreate(mailResult)
      }
      const saveResult = identityUserSave(databaseResult.data, userResult.data)
      if (!saveResult.success) return apiErrorResponseCreate(saveResult)
    } else {
      const saveResult = databaseTransaction(databaseResult.data, () => {
        databaseResult.data.run("INSERT OR REPLACE INTO invitations (email) VALUES (?)", [email])
        return identityUserSave(databaseResult.data, userResult.data)
      })
      if (!saveResult.success) return apiErrorResponseCreate(saveResult)
    }
    const jsonResult = adminUserJsonCreate(databaseResult.data, userResult.data, options.identityConfig, false)
    if (!jsonResult.success) return apiErrorResponseCreate(jsonResult)
    return context.json(jsonResult.data)
  }

  const testSmtp = async (context: Context<any>): Promise<Response> => {
    const bodyResult = await requestBodyParse(context, adminInviteDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    if (!options.identityConfig.MAIL_ENABLED)
      return apiErrorResponseCreate(adminError("adminTestSmtp", "Mail is not enabled"))
    if (options.mail.sendTest !== undefined) {
      const mailResult = await options.mail.sendTest(bodyResult.data.email)
      if (!mailResult.success) return apiErrorResponseCreate(mailResult)
    }
    return adminEmptyResponse()
  }

  const logout = (context: Context<any>): Response =>
    new Response(null, {
      headers: { location: "/admin/", "set-cookie": adminCookieClear(adminCookieSecure(context)) },
      status: 303,
    })

  const users = (context: Context<any>): Response => {
    const databaseResult = adminDatabaseRequire(context, options)
    if (!databaseResult.success) return apiErrorResponseCreate(databaseResult)
    const usersResult = adminUsersFindAll(databaseResult.data)
    if (!usersResult.success) return apiErrorResponseCreate(usersResult)
    const usersJson: Record<string, unknown>[] = []
    for (const user of usersResult.data) {
      const userJsonResult = adminUserJsonCreate(databaseResult.data, user, options.identityConfig, true)
      if (!userJsonResult.success) return apiErrorResponseCreate(userJsonResult)
      usersJson.push(userJsonResult.data)
    }
    return context.json(usersJson)
  }

  const usersOverview = (context: Context<any>): Response => {
    const databaseResult = adminDatabaseRequire(context, options)
    if (!databaseResult.success) return apiErrorResponseCreate(databaseResult)
    const usersResult = adminUsersFindAll(databaseResult.data)
    if (!usersResult.success) return apiErrorResponseCreate(usersResult)
    const users = usersResult.data.map((user) => ({
      ...identityUserJsonForOverview(user, databaseResult.data, options.identityConfig),
    }))
    return adminHtmlResponse("admin/users", users)
  }

  const userByMail = (context: Context<any>): Response => {
    const databaseResult = adminDatabaseRequire(context, options)
    if (!databaseResult.success) return apiErrorResponseCreate(databaseResult)
    const email = context.req.param("mail")
    if (email === undefined) return apiErrorResponseCreate(adminNotFoundError("adminGetUserByMail"))
    const userResult = adminUserFindByEmail(databaseResult.data, email)
    if (!userResult.success) return apiErrorResponseCreate(userResult)
    if (userResult.data === null) return apiErrorResponseCreate(adminNotFoundError("adminGetUserByMail"))
    const jsonResult = adminUserJsonCreate(databaseResult.data, userResult.data, options.identityConfig, false)
    if (!jsonResult.success) return apiErrorResponseCreate(jsonResult)
    return context.json(jsonResult.data)
  }

  const user = (context: Context<any>): Response => {
    const databaseResult = adminDatabaseRequire(context, options)
    if (!databaseResult.success) return apiErrorResponseCreate(databaseResult)
    const userId = context.req.param("user_id")
    if (userId === undefined) return apiErrorResponseCreate(adminNotFoundError("adminGetUser"))
    const userResult = adminUserFindByUuid(databaseResult.data, userId)
    if (!userResult.success) return apiErrorResponseCreate(userResult)
    if (userResult.data === null) return apiErrorResponseCreate(adminNotFoundError("adminGetUser"))
    const jsonResult = adminUserJsonCreate(databaseResult.data, userResult.data, options.identityConfig, false)
    if (!jsonResult.success) return apiErrorResponseCreate(jsonResult)
    return context.json(jsonResult.data)
  }

  const deleteUser = (context: Context<any>): Response => {
    const databaseResult = adminDatabaseRequire(context, options)
    if (!databaseResult.success) return apiErrorResponseCreate(databaseResult)
    const userId = context.req.param("user_id")
    if (userId === undefined) return apiErrorResponseCreate(adminNotFoundError("adminDeleteUser"))
    const userResult = adminUserFindByUuid(databaseResult.data, userId)
    if (!userResult.success) return apiErrorResponseCreate(userResult)
    if (userResult.data === null) return apiErrorResponseCreate(adminNotFoundError("adminDeleteUser"))
    const deleteResult = adminUserDelete(databaseResult.data, userResult.data)
    if (!deleteResult.success) return apiErrorResponseCreate(deleteResult)
    return adminEmptyResponse()
  }

  const deleteSsoUser = (context: Context<any>): Response => {
    const databaseResult = adminDatabaseRequire(context, options)
    if (!databaseResult.success) return apiErrorResponseCreate(databaseResult)
    const userId = context.req.param("user_id")
    if (userId === undefined) return apiErrorResponseCreate(adminNotFoundError("adminDeleteSsoUser"))
    try {
      databaseResult.data.run("DELETE FROM sso_users WHERE user_uuid = ?", [userId])
      return adminEmptyResponse()
    } catch {
      return apiErrorResponseCreate(adminError("adminDeleteSsoUser", "SSO user deletion failed", "platform.internal"))
    }
  }

  const deauthUser = async (context: Context<any>, disable: boolean): Promise<Response> => {
    const databaseResult = adminDatabaseRequire(context, options)
    if (!databaseResult.success) return apiErrorResponseCreate(databaseResult)
    const userId = context.req.param("user_id")
    if (userId === undefined)
      return apiErrorResponseCreate(adminNotFoundError(disable ? "adminDisableUser" : "adminDeauthUser"))
    const userResult = adminUserFindByUuid(databaseResult.data, userId)
    if (!userResult.success) return apiErrorResponseCreate(userResult)
    if (userResult.data === null)
      return apiErrorResponseCreate(adminNotFoundError(disable ? "adminDisableUser" : "adminDeauthUser"))
    const devicesResult = identityDeviceFindByUser(databaseResult.data, userId)
    if (!devicesResult.success) return apiErrorResponseCreate(devicesResult)
    if (options.push !== undefined) {
      for (const device of devicesResult.data) {
        const unregisterResult = await options.push.unregisterDevice(device.pushUuid)
        if (!unregisterResult.success) continue
      }
    }
    const user = userResult.data
    user.securityStamp = options.identifier.uuid()
    user.enabled = !disable
    user.updatedAt = options.clock.now().toISOString()
    const saveResult = identityUserSave(databaseResult.data, user)
    if (!saveResult.success) return apiErrorResponseCreate(saveResult)
    const deleteResult = identityDeviceDeleteAllByUser(databaseResult.data, user.uuid)
    if (!deleteResult.success) return apiErrorResponseCreate(deleteResult)
    return adminEmptyResponse()
  }

  const enableUser = (context: Context<any>): Response => {
    const databaseResult = adminDatabaseRequire(context, options)
    if (!databaseResult.success) return apiErrorResponseCreate(databaseResult)
    const userId = context.req.param("user_id")
    if (userId === undefined) return apiErrorResponseCreate(adminNotFoundError("adminEnableUser"))
    const userResult = adminUserFindByUuid(databaseResult.data, userId)
    if (!userResult.success) return apiErrorResponseCreate(userResult)
    if (userResult.data === null) return apiErrorResponseCreate(adminNotFoundError("adminEnableUser"))
    userResult.data.enabled = true
    userResult.data.updatedAt = options.clock.now().toISOString()
    const saveResult = identityUserSave(databaseResult.data, userResult.data)
    if (!saveResult.success) return apiErrorResponseCreate(saveResult)
    return adminEmptyResponse()
  }

  const removeTwoFactor = (context: Context<any>): Response => {
    const databaseResult = adminDatabaseRequire(context, options)
    if (!databaseResult.success) return apiErrorResponseCreate(databaseResult)
    const userId = context.req.param("user_id")
    if (userId === undefined) return apiErrorResponseCreate(adminNotFoundError("adminRemoveTwoFactor"))
    const userResult = adminUserFindByUuid(databaseResult.data, userId)
    if (!userResult.success) return apiErrorResponseCreate(userResult)
    if (userResult.data === null) return apiErrorResponseCreate(adminNotFoundError("adminRemoveTwoFactor"))
    try {
      databaseResult.data.run("DELETE FROM twofactor WHERE user_uuid = ?", [userId])
    } catch {
      // The current schema may not have the optional two-factor table yet.
      // Keep the admin boundary idempotent until that context is available.
    }
    return adminEmptyResponse()
  }

  const resendInvite = async (context: Context<any>): Promise<Response> => {
    const databaseResult = adminDatabaseRequire(context, options)
    if (!databaseResult.success) return apiErrorResponseCreate(databaseResult)
    const userId = context.req.param("user_id")
    if (userId === undefined) return apiErrorResponseCreate(adminNotFoundError("adminResendUserInvite"))
    const userResult = adminUserFindByUuid(databaseResult.data, userId)
    if (!userResult.success) return apiErrorResponseCreate(userResult)
    if (userResult.data === null) return apiErrorResponseCreate(adminNotFoundError("adminResendUserInvite"))
    if (userResult.data.passwordHash.byteLength > 0)
      return apiErrorResponseCreate(adminError("adminResendUserInvite", "User already accepted invitation"))
    if (options.identityConfig.MAIL_ENABLED && options.mail.sendInvite !== undefined) {
      const mailResult = await options.mail.sendInvite(
        userResult.data.email,
        options.config.INVITATION_ORG_NAME,
        adminInviteOrganizationId(options.identityConfig),
      )
      if (!mailResult.success) return apiErrorResponseCreate(mailResult)
    }
    return adminEmptyResponse()
  }

  const updateMembershipType = async (context: Context<any>): Promise<Response> => {
    const databaseResult = adminDatabaseRequire(context, options)
    if (!databaseResult.success) return apiErrorResponseCreate(databaseResult)
    const bodyResult = await requestBodyParse(context, adminMembershipTypeDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const membershipType = adminMembershipTypeResolve(bodyResult.data.user_type)
    if (membershipType === undefined)
      return apiErrorResponseCreate(adminError("adminUpdateMembershipType", "Invalid type"))
    try {
      const membership = databaseResult.data
        .query<{ uuid: string; atype: number }, [string, string]>(
          "SELECT uuid, atype FROM users_organizations WHERE user_uuid = ? AND org_uuid = ? LIMIT 1",
        )
        .get(bodyResult.data.user_uuid, bodyResult.data.org_uuid)
      if (membership === null)
        return apiErrorResponseCreate(
          adminError("adminUpdateMembershipType", "The specified user isn't member of the organization"),
        )
      if (membership.atype === 0 && membershipType !== 0) {
        const ownerCount = databaseResult.data
          .query<{ count: number }, [string]>(
            "SELECT COUNT(*) AS count FROM users_organizations WHERE org_uuid = ? AND status = 2 AND atype = 0",
          )
          .get(bodyResult.data.org_uuid)?.count
        if ((ownerCount ?? 0) <= 1)
          return apiErrorResponseCreate(
            adminError("adminUpdateMembershipType", "Can't change the type of the last owner"),
          )
      }
      databaseResult.data.run("UPDATE users_organizations SET atype = ? WHERE uuid = ?", [
        membershipType,
        membership.uuid,
      ])
      return adminEmptyResponse()
    } catch {
      return apiErrorResponseCreate(
        adminError("adminUpdateMembershipType", "Membership update failed", "platform.internal"),
      )
    }
  }

  const updateRevision = (context: Context<any>): Response => {
    const databaseResult = adminDatabaseRequire(context, options)
    if (!databaseResult.success) return apiErrorResponseCreate(databaseResult)
    try {
      databaseResult.data.run("UPDATE users SET updated_at = ?", [options.clock.now().toISOString()])
      return adminEmptyResponse()
    } catch {
      return apiErrorResponseCreate(
        adminError("adminUpdateRevisionUsers", "Error updating revision date for all users", "platform.internal"),
      )
    }
  }

  const organizationsOverview = (context: Context<any>): Response => {
    const databaseResult = adminDatabaseRequire(context, options)
    if (!databaseResult.success) return apiErrorResponseCreate(databaseResult)
    try {
      const organizations = databaseResult.data
        .query<AdminOrganizationRow, []>(
          "SELECT uuid, name, billing_email, private_key, public_key FROM organizations ORDER BY uuid",
        )
        .all()
        .map((organization) => ({
          ...adminOrganizationJsonCreate(organization, options.identityConfig.MAIL_ENABLED),
          user_count: adminCount(databaseResult.data, "users_organizations", "org_uuid", organization.uuid),
          cipher_count: adminCount(databaseResult.data, "ciphers", "organization_uuid", organization.uuid),
          collection_count: adminCount(databaseResult.data, "collections", "org_uuid", organization.uuid),
          group_count: adminCount(databaseResult.data, "groups", "organizations_uuid", organization.uuid),
          event_count: adminOrganizationEventCount(databaseResult.data, organization.uuid),
          ...adminOrganizationAttachmentMetricsFind(databaseResult.data, organization.uuid),
        }))
      return adminHtmlResponse("admin/organizations", organizations)
    } catch {
      return apiErrorResponseCreate(
        adminError("adminOrganizationsOverview", "Organization lookup failed", "platform.internal"),
      )
    }
  }

  const deleteOrganization = (context: Context<any>): Response => {
    const databaseResult = adminDatabaseRequire(context, options)
    if (!databaseResult.success) return apiErrorResponseCreate(databaseResult)
    const organizationId = context.req.param("org_id")
    if (organizationId === undefined) return apiErrorResponseCreate(adminNotFoundError("adminDeleteOrganization"))
    const deleteResult = adminOrganizationDelete(databaseResult.data, organizationId)
    if (!deleteResult.success) return apiErrorResponseCreate(deleteResult)
    return adminEmptyResponse()
  }

  const diagnostics = async (context: Context<any>): Promise<Response> => {
    const database = options.database
    const ipHeader = adminIpHeaderResolve(context)
    const collected = await options.diagnostics.collect({
      database,
      ipHeaderName: ipHeader,
      requestUrl: context.req.url,
    })
    let dbVersion: number | null = null
    if (database !== undefined) {
      try {
        dbVersion =
          database.query<{ version: number | null }, []>("SELECT MAX(version) AS version FROM schema_version").get()
            ?.version ?? null
      } catch {
        dbVersion = null
      }
    }
    return adminHtmlResponse("admin/diagnostics", {
      ...collected,
      admin_url: `${new URL(context.req.url).origin}/admin/diagnostics`,
      current_release: options.version ?? "0.0.0",
      db_type: "SQLite",
      db_version: dbVersion,
      server_time: options.clock.now().toISOString(),
      web_vault_enabled: options.webVaultEnabled ?? true,
    })
  }

  const diagnosticsConfig = (context: Context<any>): Response => context.json(options.configuration.getSupportJson())

  const diagnosticsHttp = (context: Context<any>): Response => {
    const codeText = context.req.query("code")
    const code = codeText === undefined ? 400 : Number(codeText)
    if (!Number.isInteger(code) || code < 100 || code > 999)
      return apiErrorResponseCreate(adminError("adminDiagnosticsHttp", "Invalid HTTP status code"))
    return new Response(`Testing error ${code} response`, { status: code })
  }

  const postConfig = async (context: Context<any>): Promise<Response> => {
    const bodyResult = await requestBodyParse(context, adminConfigurationDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const updateResult = options.configuration.update(bodyResult.data)
    if (!updateResult.success) return apiErrorResponseCreate(updateResult)
    return adminEmptyResponse()
  }

  const deleteConfig = (_context: Context<any>): Response => {
    const deleteResult = options.configuration.delete()
    if (!deleteResult.success) return apiErrorResponseCreate(deleteResult)
    return adminEmptyResponse()
  }

  const backup = (_context: Context<any>): Response => {
    const backupResult = options.backup.create()
    if (!backupResult.success) return apiErrorResponseCreate(backupResult)
    return new Response(`Backup to '${backupResult.data}' was successful`, {
      headers: { "content-type": "text/plain; charset=UTF-8" },
    })
  }

  app.post("/admin/", login)
  app.get("/admin/", root)
  app.get("/admin/", () => adminHtmlResponse("admin/login", { error: null }))
  app.post("/admin/invite", adminProtected(options, invite))
  app.post("/admin/test/smtp", adminProtected(options, testSmtp))
  app.get("/admin/logout", logout)
  app.get("/admin/users", adminProtected(options, users))
  app.get("/admin/users/overview", adminProtected(options, usersOverview))
  app.get("/admin/users/by-mail/:mail", adminProtected(options, userByMail))
  app.get("/admin/users/:user_id", adminProtected(options, user))
  app.post("/admin/users/:user_id/delete", adminProtected(options, deleteUser))
  app.delete("/admin/users/:user_id/sso", adminProtected(options, deleteSsoUser))
  app.post(
    "/admin/users/:user_id/deauth",
    adminProtected(options, (context) => deauthUser(context, false)),
  )
  app.post(
    "/admin/users/:user_id/disable",
    adminProtected(options, (context) => deauthUser(context, true)),
  )
  app.post("/admin/users/:user_id/enable", adminProtected(options, enableUser))
  app.post("/admin/users/:user_id/remove-2fa", adminProtected(options, removeTwoFactor))
  app.post("/admin/users/:user_id/invite/resend", adminProtected(options, resendInvite))
  app.post("/admin/users/org_type", adminProtected(options, updateMembershipType))
  app.post("/admin/users/update_revision", adminProtected(options, updateRevision))
  app.get("/admin/organizations/overview", adminProtected(options, organizationsOverview))
  app.post("/admin/organizations/:org_id/delete", adminProtected(options, deleteOrganization))
  app.get("/admin/diagnostics", adminProtected(options, diagnostics))
  app.get("/admin/diagnostics/config", adminProtected(options, diagnosticsConfig))
  app.get("/admin/diagnostics/http", adminProtected(options, diagnosticsHttp))
  app.post("/admin/config", adminProtected(options, postConfig))
  app.post("/admin/config/delete", adminProtected(options, deleteConfig))
  app.post("/admin/config/backup_db", adminProtected(options, backup))
}

function adminRouteOptionsNormalize(options: AdminRouteOptions): AdminRouteOptions & {
  backup: AdminBackupAdapter
  configuration: AdminConfigurationAdapter
  diagnostics: AdminDiagnosticsAdapter
} {
  return {
    ...options,
    backup: options.backup ?? adminBackupAdapterCreate(options.databasePath),
    configuration: options.configuration ?? adminConfigurationAdapterCreate(options.config, options.identityConfig),
    diagnostics: options.diagnostics ?? adminDiagnosticsAdapterCreate(),
  }
}

function adminProtected(options: AdminRouteOptions, handler: AdminHandler): AdminHandler {
  return async (context) => {
    const authentication = await adminAuthenticationResolve(context, options)
    if (!authentication.success) return adminUnauthorizedResponse(authentication, context)
    return handler(context)
  }
}

async function adminAuthenticationResolve(context: Context<any>, options: AdminRouteOptions): Promise<Result<void>> {
  if (options.config.DISABLE_ADMIN_TOKEN) return resultCreate(undefined)
  const cookie = adminCookieValueResolve(context.req.header("cookie"))
  if (cookie === undefined) return adminUnauthorizedError("adminAuthentication")
  const result = await adminSessionTokenVerify(
    cookie,
    adminIssuerResolve(options.publicOrigin, context.req.url),
    options.publicKey,
    options.clock,
  )
  if (!result.success) return result
  return resultCreate(undefined)
}

function adminLoginResponse(
  message: string | undefined,
  error: ResultErr | undefined,
  context: Context<any>,
  status = 200,
): Response {
  const body = { error: message ?? error?.errorMessage ?? null }
  return adminHtmlResponse(
    "admin/login",
    body,
    status,
    error !== undefined && status === 401 ? adminCookieClear(adminCookieSecure(context)) : undefined,
  )
}

function adminUnauthorizedResponse(error: ResultErr, context: Context<any>): Response {
  if ((context.req.header("accept") ?? "").includes("application/json")) {
    const response = apiErrorResponseCreate(error)
    if (adminCookieValueResolve(context.req.header("cookie")) !== undefined)
      response.headers.set("set-cookie", adminCookieClear(adminCookieSecure(context)))
    return response
  }
  return adminLoginResponse(undefined, error, context, 401)
}

function adminSettingsResponse(options: AdminRouteOptions, cookie?: string): Response {
  const settings = {
    config: options.configuration?.getPreparedJson() ?? {},
    can_backup: options.databasePath !== undefined && options.databasePath !== ":memory:",
  }
  return adminHtmlResponse("admin/settings", settings, 200, cookie)
}

function adminHtmlResponse(page: string, data: unknown, status = 200, cookie?: string): Response {
  const payload = escapeHtml(JSON.stringify({ page_content: page, page_data: data, logged_in: page !== "admin/login" }))
  const headers = new Headers({ "content-type": "text/html; charset=UTF-8" })
  if (cookie !== undefined) headers.set("set-cookie", cookie)
  return new Response(`<html><body><script type="application/json" id="admin-data">${payload}</script></body></html>`, {
    headers,
    status,
  })
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
}

function adminCookieCreate(token: string, secure: boolean, lifetimeMinutes: number): string {
  return `VW_ADMIN=${token}; Path=/admin; Max-Age=${lifetimeMinutes * 60}; SameSite=Strict; HttpOnly${secure ? "; Secure" : ""}`
}

function adminCookieClear(secure: boolean): string {
  return `VW_ADMIN=; Path=/admin; Max-Age=0; SameSite=Strict; HttpOnly${secure ? "; Secure" : ""}`
}

function adminCookieSecure(context: Context<any>): boolean {
  return new URL(context.req.url).protocol === "https:" || context.req.header("x-forwarded-proto") === "https"
}

function adminEmptyResponse(): Response {
  return new Response(null, { status: 200 })
}

function adminError(op: string, message: string, code = "platform.invalid-request"): ResultErr {
  return resultErrorCreate(op, message, { code })
}

function adminUnauthorizedError(op: string): ResultErr {
  return adminError(op, "Unauthorized", "platform.unauthorized")
}

function adminNotFoundError(op: string): ResultErr {
  return adminError(op, "User doesn't exist", "platform.not-found")
}

function adminDatabaseRequire(context: Context<any>, options: AdminRouteOptions): Result<DatabaseConnection> {
  const database = options.database ?? context.get("database")
  if (database === undefined)
    return resultErrorCreate("adminDatabaseRequire", "Database unavailable.", { code: "platform.unavailable" })
  return resultCreate(database)
}

function adminUserRowSelect(): string {
  return `SELECT uuid, enabled, created_at, updated_at, verified_at, last_verifying_at,
    login_verify_count, email, email_new, email_new_token, name, password_hash,
    salt, password_iterations, password_hint, akey, private_key, public_key,
    security_stamp, stamp_exception, equivalent_domains, excluded_globals,
    client_kdf_type, client_kdf_iter, client_kdf_memory, client_kdf_parallelism,
    api_key, avatar_color, external_id FROM users`
}

function adminUserFindByEmail(database: DatabaseConnection, email: string): Result<IdentityUser | null> {
  const op = "adminUserFindByEmail"
  try {
    const row = database
      .query<IdentityUserRow, [string]>(`${adminUserRowSelect()} WHERE email = ? LIMIT 1`)
      .get(email.toLowerCase())
    return resultCreate(row === null ? null : identityUserFromRow(row))
  } catch {
    return resultErrorCreate(op, "User lookup failed.", { code: "platform.internal" })
  }
}

function adminUserFindByUuid(database: DatabaseConnection, uuid: string): Result<IdentityUser | null> {
  const op = "adminUserFindByUuid"
  try {
    const row = database.query<IdentityUserRow, [string]>(`${adminUserRowSelect()} WHERE uuid = ? LIMIT 1`).get(uuid)
    return resultCreate(row === null ? null : identityUserFromRow(row))
  } catch {
    return resultErrorCreate(op, "User lookup failed.", { code: "platform.internal" })
  }
}

function adminUsersFindAll(database: DatabaseConnection): Result<IdentityUser[]> {
  const op = "adminUsersFindAll"
  try {
    const rows = database.query<IdentityUserRow, []>(`${adminUserRowSelect()} ORDER BY email, uuid`).all()
    return resultCreate(rows.map(identityUserFromRow))
  } catch {
    return resultErrorCreate(op, "User lookup failed.", { code: "platform.internal" })
  }
}

function adminPendingUserCreate(email: string, options: AdminRouteOptions): Result<IdentityUser> {
  const saltResult = secureRandomBytes(64)
  if (!saltResult.success) return saltResult
  const now = options.clock.now().toISOString()
  return resultCreate({
    uuid: options.identifier.uuid(),
    enabled: true,
    createdAt: now,
    updatedAt: now,
    verifiedAt: null,
    lastVerifyingAt: null,
    loginVerifyCount: 0,
    email,
    emailNew: null,
    emailNewToken: null,
    name: email,
    passwordHash: new Uint8Array(),
    salt: saltResult.data,
    passwordIterations: options.identityConfig.PASSWORD_ITERATIONS,
    passwordHint: null,
    akey: "",
    privateKey: null,
    publicKey: null,
    securityStamp: options.identifier.uuid(),
    stampException: null,
    equivalentDomains: "[]",
    excludedGlobals: "[]",
    clientKdfType: 0,
    clientKdfIter: 600_000,
    clientKdfMemory: null,
    clientKdfParallelism: null,
    apiKey: null,
    avatarColor: null,
    externalId: null,
  })
}

function adminUserDelete(database: DatabaseConnection, user: IdentityUser): Result<void> {
  const op = "adminDeleteUser"
  try {
    const lastOwner = database
      .query<{ uuid: string }, [string]>(
        `SELECT member.uuid FROM users_organizations AS member
         WHERE member.user_uuid = ? AND member.status = 2 AND member.atype = 0
         AND (SELECT COUNT(*) FROM users_organizations AS owner
              WHERE owner.org_uuid = member.org_uuid AND owner.status = 2 AND owner.atype = 0) <= 1 LIMIT 1`,
      )
      .get(user.uuid)
    if (lastOwner !== null) return adminError(op, "Can't delete last owner")
  } catch {
    return resultErrorCreate(op, "User deletion failed.", { code: "platform.internal" })
  }
  return databaseTransaction(database, () => {
    try {
      database.run("DELETE FROM favorites WHERE cipher_uuid IN (SELECT uuid FROM ciphers WHERE user_uuid = ?)", [
        user.uuid,
      ])
      database.run("DELETE FROM archives WHERE cipher_uuid IN (SELECT uuid FROM ciphers WHERE user_uuid = ?)", [
        user.uuid,
      ])
      database.run("DELETE FROM ciphers WHERE user_uuid = ?", [user.uuid])
      database.run(
        "DELETE FROM groups_users WHERE users_organizations_uuid IN (SELECT uuid FROM users_organizations WHERE user_uuid = ?)",
        [user.uuid],
      )
      database.run("DELETE FROM users_collections WHERE user_uuid = ?", [user.uuid])
      database.run("DELETE FROM folders_ciphers WHERE folder_uuid IN (SELECT uuid FROM folders WHERE user_uuid = ?)", [
        user.uuid,
      ])
      database.run("DELETE FROM folders WHERE user_uuid = ?", [user.uuid])
      database.run("DELETE FROM sso_users WHERE user_uuid = ?", [user.uuid])
      database.run("DELETE FROM users_organizations WHERE user_uuid = ?", [user.uuid])
      database.run("DELETE FROM invitations WHERE email = ?", [user.email])
      database.run("DELETE FROM devices WHERE user_uuid = ?", [user.uuid])
      database.run("DELETE FROM users WHERE uuid = ?", [user.uuid])
      return resultCreate(undefined)
    } catch {
      return resultErrorCreate(op, "User deletion failed.", { code: "platform.internal" })
    }
  })
}

function identityUserJsonForOverview(user: IdentityUser, database: DatabaseConnection, config: IdentityConfig) {
  const profile = adminUserJsonCreate(database, user, config, true)
  const profileData = profile.success ? profile.data : {}
  let cipherCount = 0
  try {
    cipherCount =
      database
        .query<{ count: number }, [string]>("SELECT COUNT(*) AS count FROM ciphers WHERE user_uuid = ?")
        .get(user.uuid)?.count ?? 0
  } catch {
    cipherCount = 0
  }
  return {
    ...profileData,
    cipher_count: cipherCount,
    ...adminUserAttachmentMetricsFind(database, user.uuid),
    user_enabled: user.enabled,
    created_at: profileData.createdAt,
    last_active: profileData.lastActive ?? "Never",
    sso_identifier: null,
  }
}

function adminOrganizationDelete(database: DatabaseConnection, organizationUuid: string): Result<void> {
  const op = "adminDeleteOrganization"
  try {
    const organization = database
      .query<{ uuid: string }, [string]>("SELECT uuid FROM organizations WHERE uuid = ? LIMIT 1")
      .get(organizationUuid)
    if (organization === null) return adminError(op, "Organization doesn't exist", "platform.not-found")
  } catch {
    return resultErrorCreate(op, "Organization lookup failed.", { code: "platform.internal" })
  }
  return databaseTransaction(database, () => {
    try {
      database.run(
        "DELETE FROM groups_users WHERE groups_uuid IN (SELECT uuid FROM groups WHERE organizations_uuid = ?)",
        [organizationUuid],
      )
      database.run(
        "DELETE FROM collections_groups WHERE collections_uuid IN (SELECT uuid FROM collections WHERE org_uuid = ?)",
        [organizationUuid],
      )
      database.run(
        "DELETE FROM users_collections WHERE collection_uuid IN (SELECT uuid FROM collections WHERE org_uuid = ?)",
        [organizationUuid],
      )
      database.run(
        "DELETE FROM favorites WHERE cipher_uuid IN (SELECT uuid FROM ciphers WHERE organization_uuid = ?)",
        [organizationUuid],
      )
      database.run("DELETE FROM archives WHERE cipher_uuid IN (SELECT uuid FROM ciphers WHERE organization_uuid = ?)", [
        organizationUuid,
      ])
      database.run("DELETE FROM ciphers WHERE organization_uuid = ?", [organizationUuid])
      database.run("DELETE FROM collections WHERE org_uuid = ?", [organizationUuid])
      database.run("DELETE FROM groups WHERE organizations_uuid = ?", [organizationUuid])
      database.run("DELETE FROM users_organizations WHERE org_uuid = ?", [organizationUuid])
      database.run("DELETE FROM organization_api_key WHERE org_uuid = ?", [organizationUuid])
      database.run("DELETE FROM organizations WHERE uuid = ?", [organizationUuid])
      return resultCreate(undefined)
    } catch {
      return resultErrorCreate(op, "Organization deletion failed.", { code: "platform.internal" })
    }
  })
}

function adminMembershipTypeResolve(value: number | string): number | undefined {
  const normalized = String(value)
  if (normalized === "0" || normalized === "Owner") return 0
  if (normalized === "1" || normalized === "Admin") return 1
  if (normalized === "2" || normalized === "User") return 2
  if (normalized === "3" || normalized === "Manager" || normalized === "4" || normalized === "Custom") return 3
  return undefined
}

function adminInviteOrganizationId(config: IdentityConfig): string {
  return config.SSO_ENABLED ? adminFakeSsoIdentifier : adminFakeUuid
}

function adminCount(database: DatabaseConnection, table: string, column: string, value: string): number {
  const safeTables = new Set(["users_organizations", "ciphers", "collections", "groups"])
  if (!safeTables.has(table)) return 0
  return (
    database.query<{ count: number }, [string]>(`SELECT COUNT(*) AS count FROM ${table} WHERE ${column} = ?`).get(value)
      ?.count ?? 0
  )
}

function adminOrganizationEventCount(database: DatabaseConnection, organizationUuid: string): number {
  try {
    return (
      database
        .query<{ count: number }, [string]>("SELECT COUNT(*) AS count FROM event WHERE org_uuid = ?")
        .get(organizationUuid)?.count ?? 0
    )
  } catch {
    return 0
  }
}

function adminOrganizationAttachmentMetricsFind(
  database: DatabaseConnection,
  organizationUuid: string,
): { attachment_count: number; attachment_size: string } {
  try {
    const metrics = database
      .query<{ count: number; size: number | null }, [string]>(
        `SELECT COUNT(*) AS count, COALESCE(SUM(attachment.file_size), 0) AS size
         FROM attachments AS attachment
         JOIN ciphers AS cipher ON cipher.uuid = attachment.cipher_uuid
         WHERE cipher.organization_uuid = ?`,
      )
      .get(organizationUuid)
    return {
      attachment_count: metrics?.count ?? 0,
      attachment_size: adminDisplaySize(metrics?.size ?? 0),
    }
  } catch {
    return { attachment_count: 0, attachment_size: adminDisplaySize(0) }
  }
}

function adminUserAttachmentMetricsFind(
  database: DatabaseConnection,
  userUuid: string,
): { attachment_count: number; attachment_size: string } {
  try {
    const metrics = database
      .query<{ count: number; size: number | null }, [string]>(
        `SELECT COUNT(*) AS count, COALESCE(SUM(attachment.file_size), 0) AS size
         FROM attachments AS attachment
         JOIN ciphers AS cipher ON cipher.uuid = attachment.cipher_uuid
         WHERE cipher.user_uuid = ?`,
      )
      .get(userUuid)
    return {
      attachment_count: metrics?.count ?? 0,
      attachment_size: adminDisplaySize(metrics?.size ?? 0),
    }
  } catch {
    return { attachment_count: 0, attachment_size: adminDisplaySize(0) }
  }
}

function adminDisplaySize(size: number): string {
  const units = ["bytes", "KB", "MB", "GB", "TB", "PB"]
  let value = size
  let unit = 0
  while (value > 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(2)} ${units[unit]}`
}

function adminIpHeaderResolve(context: Context<any>): string {
  for (const name of ["x-client-ip", "x-real-ip", "x-forwarded-for"]) {
    if (context.req.header(name) !== undefined) return name
  }
  return ""
}
