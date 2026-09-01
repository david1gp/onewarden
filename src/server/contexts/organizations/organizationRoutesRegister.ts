import type { Context, Hono } from "hono"
import type { Result } from "#result"
import { apiErrorResponseCreate } from "../../../shared/api/apiErrorResponseCreate.js"
import { passwordHashVerify } from "../../../shared/crypto/passwordHashVerify.js"
import { requestBodyParse } from "../../../shared/validation/requestBodyParse.js"
import { requestPathParse } from "../../../shared/validation/requestPathParse.js"
import { authenticationContextGet } from "../authentication/authenticationContextGet.js"
import type { AuthenticationEnvironment } from "../authentication/authenticationEnvironment.js"
import { authenticationMiddlewareCreate } from "../authentication/authenticationMiddlewareCreate.js"
import { eventLogContextCreate } from "../events/eventLogContextCreate.js"
import { eventType } from "../events/eventType.js"
import type { IdentityAccountPasswordOrOtpData } from "../identity/identityAccountPasswordOrOtpDataSchema.js"
import { identityAccountPasswordOrOtpDataSchema } from "../identity/identityAccountPasswordOrOtpDataSchema.js"
import { identityOriginResolve } from "../identity/identityOriginResolve.js"
import { notificationUpdateType } from "../notifications/notificationUpdateType.js"
import { organizationAdminMiddleware } from "./organizationAdminMiddleware.js"
import { organizationApiKeyCreateOrRotate } from "./organizationApiKeyCreateOrRotate.js"
import { organizationApiKeyToJson } from "./organizationApiKeyToJson.js"
import { organizationAutoEnrollStatusFind } from "./organizationAutoEnrollStatusFind.js"
import { organizationBillingRoutesRegister } from "./organizationBillingRoutesRegister.js"
import { organizationCollectionRoutesRegister } from "./organizationCollectionRoutesRegister.js"
import { organizationCreate } from "./organizationCreate.js"
import { organizationCreateDataSchema } from "./organizationCreateDataSchema.js"
import { organizationDelete } from "./organizationDelete.js"
import type { OrganizationDeleteData } from "./organizationDeleteDataSchema.js"
import { organizationDeleteDataSchema } from "./organizationDeleteDataSchema.js"
import { organizationDomainRoutesRegister } from "./organizationDomainRoutesRegister.js"
import { organizationErrorCreate } from "./organizationErrorCreate.js"
import { organizationExport } from "./organizationExport.js"
import { organizationFindByUuid } from "./organizationFindByUuid.js"
import { organizationGroupRoutesRegister } from "./organizationGroupRoutesRegister.js"
import { organizationKeysDataSchema } from "./organizationKeysDataSchema.js"
import { organizationLeave } from "./organizationLeave.js"
import { organizationMemberMiddleware } from "./organizationMemberMiddleware.js"
import { organizationMembershipAccept } from "./organizationMembershipAccept.js"
import { organizationMembershipAcceptDataSchema } from "./organizationMembershipAcceptDataSchema.js"
import { organizationMembershipConfirm } from "./organizationMembershipConfirm.js"
import { organizationMembershipConfirmDataSchema } from "./organizationMembershipConfirmDataSchema.js"
import { organizationMembershipInvite } from "./organizationMembershipInvite.js"
import { organizationMembershipInviteDataSchema } from "./organizationMembershipInviteDataSchema.js"
import { organizationMembershipPathSchema } from "./organizationMembershipPathSchema.js"
import { organizationMembershipResend } from "./organizationMembershipResend.js"
import { organizationMembershipRoutesRegister } from "./organizationMembershipRoutesRegister.js"
import { organizationMemberUserUuidsFind } from "./organizationMemberUserUuidsFind.js"
import { organizationOwnerMiddleware } from "./organizationOwnerMiddleware.js"
import { organizationPolicyIsApplicableToUser } from "./organizationPolicyIsApplicableToUser.js"
import { organizationPolicyRoutesRegister } from "./organizationPolicyRoutesRegister.js"
import { organizationPolicyType } from "./organizationPolicyType.js"
import type { OrganizationRouteOptions } from "./organizationRouteOptions.js"
import { organizationSave } from "./organizationSave.js"
import { organizationSsoRoutesRegister } from "./organizationSsoRoutesRegister.js"
import { organizationToJson } from "./organizationToJson.js"
import { organizationUpdateDataSchema } from "./organizationUpdateDataSchema.js"

export function organizationRoutesRegister(
  app: Hono<AuthenticationEnvironment>,
  options: OrganizationRouteOptions,
): void {
  organizationPolicyRoutesRegister(app, options)
  organizationDomainRoutesRegister(app, options)
  organizationSsoRoutesRegister(app, options)
  organizationBillingRoutesRegister(app, options)
  organizationCollectionRoutesRegister(app, options)
  organizationGroupRoutesRegister(app, options)
  const authenticate = authenticationMiddlewareCreate({
    clock: options.clock,
    database: options.database,
    publicKey: options.publicKey,
    publicOrigin: options.publicOrigin,
  })
  const organizationAuthentication = {
    clock: options.clock,
    database: options.database,
    publicKey: options.publicKey,
    publicOrigin: options.publicOrigin,
  }

  const databaseResolve = (context: Context<AuthenticationEnvironment>) => options.database ?? context.get("database")

  const create = async (context: Context<AuthenticationEnvironment>) => {
    const authentication = authenticationContextGet(context)
    if (authentication === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationRoutesCreate", "Authentication is required.", 401),
      )
    const database = databaseResolve(context)
    if (database === undefined)
      return apiErrorResponseCreate(organizationErrorCreate("organizationRoutesCreate", "Database unavailable."))
    if (!organizationCreationAllowed(options.config, authentication.user.email))
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationRoutesCreate", "User not allowed to create organizations"),
      )
    const singleOrganizationResult = organizationPolicyIsApplicableToUser(
      database,
      authentication.user.uuid,
      organizationPolicyType.singleOrganization,
    )
    if (!singleOrganizationResult.success) return apiErrorResponseCreate(singleOrganizationResult)
    if (singleOrganizationResult.data)
      return apiErrorResponseCreate(
        organizationErrorCreate(
          "organizationRoutesCreate",
          "You may not create an organization. You belong to an organization which has a policy that prohibits you from being a member of any other organization.",
        ),
      )
    const bodyResult = await requestBodyParse(context, organizationCreateDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const result = organizationCreate(
      database,
      authentication.user.uuid,
      bodyResult.data,
      options.clock,
      options.identifier,
    )
    if (!result.success) return apiErrorResponseCreate(result)
    organizationMembersNotify(database, result.data.uuid, authentication.device.uuid, options, "syncSettings")
    return context.json(
      organizationToJson(result.data, {
        eventsEnabled: options.config.ORG_EVENTS_ENABLED,
        groupsEnabled: options.groupsEnabled,
        mailEnabled: options.config.MAIL_ENABLED,
      }),
    )
  }

  const get = (context: Context<AuthenticationEnvironment>) => {
    const database = databaseResolve(context)
    if (database === undefined)
      return apiErrorResponseCreate(organizationErrorCreate("organizationRoutesGet", "Database unavailable."))
    const organizationUuid = context.get("organizationId")
    if (organizationUuid === undefined)
      return apiErrorResponseCreate(organizationErrorCreate("organizationRoutesGet", "Organization not found", 404))
    const result = organizationFindByUuid(database, organizationUuid)
    if (!result.success) return apiErrorResponseCreate(result)
    if (result.data === null)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationRoutesGet", "Can't find organization details", 404),
      )
    return context.json(
      organizationToJson(result.data, {
        eventsEnabled: options.config.ORG_EVENTS_ENABLED,
        groupsEnabled: options.groupsEnabled,
        mailEnabled: options.config.MAIL_ENABLED,
      }),
    )
  }

  const update = async (context: Context<AuthenticationEnvironment>) => {
    const database = databaseResolve(context)
    if (database === undefined)
      return apiErrorResponseCreate(organizationErrorCreate("organizationRoutesUpdate", "Database unavailable."))
    const organizationUuid = context.get("organizationId")
    if (organizationUuid === undefined)
      return apiErrorResponseCreate(organizationErrorCreate("organizationRoutesUpdate", "Organization not found", 404))
    const bodyResult = await requestBodyParse(context, organizationUpdateDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const organizationResult = organizationFindByUuid(database, organizationUuid)
    if (!organizationResult.success) return apiErrorResponseCreate(organizationResult)
    if (organizationResult.data === null)
      return apiErrorResponseCreate(organizationErrorCreate("organizationRoutesUpdate", "Organization not found", 404))
    const organization = {
      ...organizationResult.data,
      billingEmail: bodyResult.data.billingEmail.toLowerCase(),
      name: bodyResult.data.name,
    }
    const saveResult = organizationSave(database, organization, options.clock.now().toISOString())
    if (!saveResult.success) return apiErrorResponseCreate(saveResult)
    const authentication = authenticationContextGet(context)
    if (authentication !== undefined) {
      options.event?.organizationEventCreate(
        eventType.organizationUpdated,
        organization.uuid,
        organization.uuid,
        authentication.user.uuid,
        eventLogContextCreate(authentication),
      )
      organizationMembersNotify(database, organization.uuid, authentication.device.uuid, options, "syncSettings")
    }
    return context.json(
      organizationToJson(organization, {
        eventsEnabled: options.config.ORG_EVENTS_ENABLED,
        groupsEnabled: options.groupsEnabled,
        mailEnabled: options.config.MAIL_ENABLED,
      }),
    )
  }

  const remove = async (context: Context<AuthenticationEnvironment>) => {
    const authentication = authenticationContextGet(context)
    if (authentication === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationRoutesDelete", "Authentication is required.", 401),
      )
    const database = databaseResolve(context)
    if (database === undefined)
      return apiErrorResponseCreate(organizationErrorCreate("organizationRoutesDelete", "Database unavailable."))
    const organizationUuid = context.get("organizationId")
    if (organizationUuid === undefined)
      return apiErrorResponseCreate(organizationErrorCreate("organizationRoutesDelete", "Organization not found", 404))
    const bodyResult = await requestBodyParse(context, organizationDeleteDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const validationResult = await organizationDeleteValidation(authentication.user, bodyResult.data)
    if (!validationResult.success) return apiErrorResponseCreate(validationResult)
    const memberUuids = organizationMemberUserUuidsFind(database, organizationUuid)
    const deleteResult = organizationDelete(database, organizationUuid, options.clock.now().toISOString())
    if (!deleteResult.success) return apiErrorResponseCreate(deleteResult)
    if (memberUuids.success)
      organizationUsersNotify(
        memberUuids.data,
        authentication.device.uuid,
        options,
        "syncSettings",
        options.clock.now(),
      )
    return new Response(null, { status: 200 })
  }

  const keys = async (context: Context<AuthenticationEnvironment>) => {
    const database = databaseResolve(context)
    if (database === undefined)
      return apiErrorResponseCreate(organizationErrorCreate("organizationRoutesKeys", "Database unavailable."))
    const organizationUuid = context.get("organizationId")
    if (organizationUuid === undefined)
      return apiErrorResponseCreate(organizationErrorCreate("organizationRoutesKeys", "Organization not found", 404))
    const bodyResult = await requestBodyParse(context, organizationKeysDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const organizationResult = organizationFindByUuid(database, organizationUuid)
    if (!organizationResult.success) return apiErrorResponseCreate(organizationResult)
    if (organizationResult.data === null)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationRoutesKeys", "Can't find organization details", 404),
      )
    const organization = organizationResult.data
    if (organization.privateKey !== null && organization.publicKey !== null)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationRoutesKeys", "Organization Keys already exist"),
      )
    const nextOrganization = {
      ...organization,
      privateKey: bodyResult.data.encryptedPrivateKey,
      publicKey: bodyResult.data.publicKey,
    }
    const saveResult = organizationSave(database, nextOrganization, options.clock.now().toISOString())
    if (!saveResult.success) return apiErrorResponseCreate(saveResult)
    const authentication = authenticationContextGet(context)
    if (authentication !== undefined)
      organizationMembersNotify(database, organizationUuid, authentication.device.uuid, options, "syncOrgKeys")
    return context.json({
      object: "organizationKeys",
      publicKey: nextOrganization.publicKey,
      privateKey: nextOrganization.privateKey,
    })
  }

  const leave = (context: Context<AuthenticationEnvironment>) => {
    const database = databaseResolve(context)
    if (database === undefined)
      return apiErrorResponseCreate(organizationErrorCreate("organizationRoutesLeave", "Database unavailable."))
    const membership = context.get("organizationMembership")
    if (membership === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationRoutesLeave", "The current user isn't member of the organization", 401),
      )
    const result = organizationLeave(database, membership, options.clock.now().toISOString())
    if (!result.success) return apiErrorResponseCreate(result)
    const authentication = authenticationContextGet(context)
    if (authentication !== undefined) {
      options.event?.organizationEventCreate(
        eventType.organizationUserLeft,
        membership.uuid,
        membership.organizationUuid,
        authentication.user.uuid,
        eventLogContextCreate(authentication),
      )
      organizationUsersNotify(
        [membership.userUuid],
        authentication.device.uuid,
        options,
        "syncSettings",
        options.clock.now(),
      )
    }
    return new Response(null, { status: 200 })
  }

  const exportOrganization = async (context: Context<AuthenticationEnvironment>) => {
    const authentication = authenticationContextGet(context)
    if (authentication === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationRoutesExport", "Authentication is required.", 401),
      )
    const database = databaseResolve(context)
    if (database === undefined)
      return apiErrorResponseCreate(organizationErrorCreate("organizationRoutesExport", "Database unavailable."))
    const organizationUuid = context.get("organizationId")
    if (organizationUuid === undefined)
      return apiErrorResponseCreate(organizationErrorCreate("organizationRoutesExport", "Organization not found", 404))
    const result = await organizationExport(database, organizationUuid, {
      clock: options.clock,
      origin: authentication.host,
      privateKey: options.privateKey,
    })
    if (!result.success) return apiErrorResponseCreate(result)
    return context.json(result.data)
  }

  const updateApiKey = async (context: Context<AuthenticationEnvironment>, rotate: boolean) => {
    const authentication = authenticationContextGet(context)
    if (authentication === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationRoutesApiKey", "Authentication is required.", 401),
      )
    const database = databaseResolve(context)
    if (database === undefined)
      return apiErrorResponseCreate(organizationErrorCreate("organizationRoutesApiKey", "Database unavailable."))
    const organizationUuid = context.get("organizationId")
    if (organizationUuid === undefined)
      return apiErrorResponseCreate(organizationErrorCreate("organizationRoutesApiKey", "Organization not found", 404))
    const bodyResult = await requestBodyParse(context, identityAccountPasswordOrOtpDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const validationResult = await organizationPasswordOrOtpValidate(authentication.user, bodyResult.data)
    if (!validationResult.success) return apiErrorResponseCreate(validationResult)
    const apiKeyResult = organizationApiKeyCreateOrRotate(
      database,
      organizationUuid,
      rotate,
      options.clock,
      options.identifier,
    )
    if (!apiKeyResult.success) return apiErrorResponseCreate(apiKeyResult)
    return context.json(organizationApiKeyToJson(apiKeyResult.data))
  }

  const getAutoEnrollStatus = (context: Context<AuthenticationEnvironment>) => {
    const authentication = authenticationContextGet(context)
    if (authentication === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationRoutesGetAutoEnrollStatus", "Authentication is required.", 401),
      )
    const database = databaseResolve(context)
    if (database === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationRoutesGetAutoEnrollStatus", "Database unavailable."),
      )
    const identifier = context.req.param("identifier") ?? ""
    const result = organizationAutoEnrollStatusFind(database, authentication.user.uuid, identifier)
    if (!result.success) return apiErrorResponseCreate(result)
    return context.json(result.data)
  }

  const inviteMember = async (context: Context<AuthenticationEnvironment>) => {
    const authentication = authenticationContextGet(context)
    if (authentication === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationRoutesInvite", "Authentication is required.", 401),
      )
    const database = databaseResolve(context)
    if (database === undefined)
      return apiErrorResponseCreate(organizationErrorCreate("organizationRoutesInvite", "Database unavailable."))
    const organizationUuid = context.get("organizationId")
    if (organizationUuid === undefined)
      return apiErrorResponseCreate(organizationErrorCreate("organizationRoutesInvite", "Organization not found", 404))
    const actorMembership = context.get("organizationMembership")
    if (actorMembership === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationRoutesInvite", "The current user isn't member of the organization", 401),
      )
    const bodyResult = await requestBodyParse(context, organizationMembershipInviteDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const result = await organizationMembershipInvite(
      database,
      organizationUuid,
      authentication.user.email,
      bodyResult.data,
      {
        actorMembership,
        clock: options.clock,
        config: options.config,
        identifier: options.identifier,
        issuer: identityOriginResolve(options.publicOrigin, context.req.url),
        mail: options.mail,
        privateKey: options.privateKey,
      },
    )
    if (!result.success) return apiErrorResponseCreate(result)
    return new Response(null, { status: 200 })
  }

  const resendMember = async (context: Context<AuthenticationEnvironment>) => {
    const authentication = authenticationContextGet(context)
    if (authentication === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationRoutesResend", "Authentication is required.", 401),
      )
    const database = databaseResolve(context)
    if (database === undefined)
      return apiErrorResponseCreate(organizationErrorCreate("organizationRoutesResend", "Database unavailable."))
    const pathResult = requestPathParse(context, organizationMembershipPathSchema)
    if (!pathResult.success) return apiErrorResponseCreate(pathResult)
    const result = await organizationMembershipResend(
      database,
      pathResult.data.org_id,
      pathResult.data.member_id,
      authentication.user.email,
      {
        clock: options.clock,
        config: options.config,
        issuer: identityOriginResolve(options.publicOrigin, context.req.url),
        mail: options.mail,
        privateKey: options.privateKey,
      },
    )
    if (!result.success) return apiErrorResponseCreate(result)
    return new Response(null, { status: 200 })
  }

  const acceptMember = async (context: Context<AuthenticationEnvironment>) => {
    const authentication = authenticationContextGet(context)
    if (authentication === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationRoutesAccept", "Authentication is required.", 401),
      )
    const database = databaseResolve(context)
    if (database === undefined)
      return apiErrorResponseCreate(organizationErrorCreate("organizationRoutesAccept", "Database unavailable."))
    const pathResult = requestPathParse(context, organizationMembershipPathSchema)
    if (!pathResult.success) return apiErrorResponseCreate(pathResult)
    const bodyResult = await requestBodyParse(context, organizationMembershipAcceptDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const result = await organizationMembershipAccept(
      database,
      authentication.user,
      pathResult.data.org_id,
      pathResult.data.member_id,
      bodyResult.data,
      {
        clock: options.clock,
        config: options.config,
        issuer: identityOriginResolve(options.publicOrigin, context.req.url),
        mail: options.mail,
        publicKey: options.publicKey,
      },
    )
    if (!result.success) return apiErrorResponseCreate(result)
    return new Response(null, { status: 200 })
  }

  const confirmMember = async (context: Context<AuthenticationEnvironment>) => {
    const authentication = authenticationContextGet(context)
    if (authentication === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationRoutesConfirm", "Authentication is required.", 401),
      )
    const database = databaseResolve(context)
    if (database === undefined)
      return apiErrorResponseCreate(organizationErrorCreate("organizationRoutesConfirm", "Database unavailable."))
    const actorMembership = context.get("organizationMembership")
    if (actorMembership === undefined)
      return apiErrorResponseCreate(
        organizationErrorCreate("organizationRoutesConfirm", "The current user isn't member of the organization", 401),
      )
    const pathResult = requestPathParse(context, organizationMembershipPathSchema)
    if (!pathResult.success) return apiErrorResponseCreate(pathResult)
    const bodyResult = await requestBodyParse(context, organizationMembershipConfirmDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const result = await organizationMembershipConfirm(
      database,
      actorMembership,
      pathResult.data.org_id,
      pathResult.data.member_id,
      bodyResult.data.key ?? "",
      { clock: options.clock, config: options.config, mail: options.mail },
    )
    if (!result.success) return apiErrorResponseCreate(result)
    organizationUsersNotify(
      [result.data.userUuid],
      authentication.device.uuid,
      options,
      "syncOrgKeys",
      new Date(result.data.revisionDate),
    )
    return new Response(null, { status: 200 })
  }

  const owner = organizationOwnerMiddleware(organizationAuthentication)
  const admin = organizationAdminMiddleware(organizationAuthentication)
  const member = organizationMemberMiddleware(organizationAuthentication)

  app.post("/api/organizations", authenticate("create_organization"), create)
  app.get(
    "/api/organizations/:identifier/auto-enroll-status",
    authenticate("get_auto_enroll_status"),
    getAutoEnrollStatus,
  )
  app.get("/api/organizations/:org_id", authenticate("get_organization"), owner, get)
  app.put("/api/organizations/:org_id", authenticate("put_organization"), owner, update)
  app.post("/api/organizations/:org_id", authenticate("post_organization"), owner, update)
  app.delete("/api/organizations/:org_id", authenticate("delete_organization"), owner, remove)
  app.post("/api/organizations/:org_id/delete", authenticate("post_delete_organization"), owner, remove)
  app.post("/api/organizations/:org_id/leave", authenticate("leave_organization"), member, leave)
  app.post("/api/organizations/:org_id/keys", authenticate("post_org_keys"), admin, keys)
  app.get("/api/organizations/:org_id/export", authenticate("get_org_export"), admin, exportOrganization)
  app.post("/api/organizations/:org_id/api-key", authenticate("post_api_key"), admin, (context) =>
    updateApiKey(context, false),
  )
  app.post("/api/organizations/:org_id/rotate-api-key", authenticate("rotate_api_key"), admin, (context) =>
    updateApiKey(context, true),
  )
  app.post("/api/organizations/:org_id/users/invite", authenticate("send_invite"), admin, inviteMember)
  app.post("/api/organizations/:org_id/users/:member_id/reinvite", authenticate("reinvite_member"), admin, resendMember)
  app.post("/api/organizations/:org_id/users/:member_id/accept", authenticate("accept_invite"), acceptMember)
  app.post("/api/organizations/:org_id/users/:member_id/confirm", authenticate("confirm_invite"), admin, confirmMember)
  organizationMembershipRoutesRegister(app, options)
}

function organizationMembersNotify(
  database: NonNullable<OrganizationRouteOptions["database"]>,
  organizationUuid: string,
  contextId: string,
  options: OrganizationRouteOptions,
  type: "syncOrgKeys" | "syncSettings",
): void {
  const memberUuids = organizationMemberUserUuidsFind(database, organizationUuid)
  if (!memberUuids.success) return
  organizationUsersNotify(memberUuids.data, contextId, options, type, options.clock.now())
}

function organizationUsersNotify(
  userUuids: readonly string[],
  contextId: string,
  options: OrganizationRouteOptions,
  type: "syncOrgKeys" | "syncSettings",
  date: Date,
): void {
  if (options.notification === undefined) return
  for (const userUuid of userUuids) {
    try {
      options.notification.sendUserUpdate({
        contextId,
        payload: { Date: date.toISOString(), UserId: userUuid },
        type: notificationUpdateType[type],
      })
    } catch {}
  }
}

async function organizationDeleteValidation(
  user: NonNullable<ReturnType<typeof authenticationContextGet>>["user"],
  data: OrganizationDeleteData,
): Promise<Result<void>> {
  const password = data.masterPasswordHash ?? data.MasterPasswordHash
  const hasPassword = password !== undefined && password !== null
  const hasOtp = data.otp !== undefined && data.otp !== null
  if ((hasPassword && hasOtp) || (!hasPassword && !hasOtp))
    return organizationErrorCreate("organizationDeleteValidation", "No validation provided")
  if (hasOtp) return organizationErrorCreate("organizationDeleteValidation", "No validation provided")
  const passwordResult = await passwordHashVerify(
    password as string,
    user.salt,
    user.passwordHash,
    user.passwordIterations,
  )
  if (!passwordResult.success) return passwordResult
  if (!passwordResult.data) return organizationErrorCreate("organizationDeleteValidation", "Invalid password")
  return { success: true, data: undefined }
}

async function organizationPasswordOrOtpValidate(
  user: NonNullable<ReturnType<typeof authenticationContextGet>>["user"],
  data: IdentityAccountPasswordOrOtpData,
): Promise<Result<void>> {
  const password = data.masterPasswordHash ?? data.MasterPasswordHash
  if (password !== undefined && password !== null && (data.otp === undefined || data.otp === null)) {
    const passwordResult = await passwordHashVerify(password, user.salt, user.passwordHash, user.passwordIterations)
    if (!passwordResult.success) return passwordResult
    if (!passwordResult.data) return organizationErrorCreate("organizationPasswordOrOtpValidate", "Invalid password")
    return { success: true, data: undefined }
  }
  return organizationErrorCreate("organizationPasswordOrOtpValidate", "No validation provided")
}

function organizationCreationAllowed(config: OrganizationRouteOptions["config"], email: string): boolean {
  const users = config.ORG_CREATION_USERS.trim().toLowerCase()
  if (users === "" || users === "all") return true
  if (users === "none") return false
  const normalizedEmail = email.toLowerCase()
  return users.split(",").some((user) => user.trim() === normalizedEmail)
}
