import type { Context, Hono } from "hono"
import * as v from "valibot"
import type { Result, ResultErr } from "#result"
import { apiErrorCreate } from "../../../shared/api/apiErrorCreate.js"
import { apiErrorResponseCreate } from "../../../shared/api/apiErrorResponseCreate.js"
import type { Clock } from "../../../shared/clock/clock.js"
import { requestBodyParse } from "../../../shared/validation/requestBodyParse.js"
import { requestPathParse } from "../../../shared/validation/requestPathParse.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { secureRandomBytes } from "../../../shared/crypto/secureRandomBytes.js"
import type { AuthenticationContext } from "../authentication/authenticationContext.js"
import type { AuthenticationEnvironment } from "../authentication/authenticationEnvironment.js"
import { authenticationContextGet } from "../authentication/authenticationContextGet.js"
import { authenticationMiddleware } from "../authentication/authenticationMiddleware.js"
import type { IdentityUser } from "../identity/identityUser.js"
import { identityInvitationTake } from "../identity/identityInvitationTake.js"
import { identityUserFindByEmail } from "../identity/identityUserFindByEmail.js"
import { identityUserFindByUuid } from "../identity/identityUserFindByUuid.js"
import { identityUserPasswordSet } from "../identity/identityUserPasswordSet.js"
import { identityUserSave } from "../identity/identityUserSave.js"
import { identityOriginResolve } from "../identity/identityOriginResolve.js"
import { cipherFindByUser } from "../ciphers/cipherFindByUser.js"
import { cipherToJson } from "../ciphers/cipherToJson.js"
import { emergencyAccessDelete } from "./emergencyAccessDelete.js"
import { emergencyAccessFindAllByGrantee } from "./emergencyAccessFindAllByGrantee.js"
import { emergencyAccessFindAllByGrantor } from "./emergencyAccessFindAllByGrantor.js"
import { emergencyAccessFindByGrantorAndGranteeOrEmail } from "./emergencyAccessFindByGrantorAndGranteeOrEmail.js"
import { emergencyAccessFindByUuidAndEmail } from "./emergencyAccessFindByUuidAndEmail.js"
import { emergencyAccessFindByUuidAndGrantee } from "./emergencyAccessFindByUuidAndGrantee.js"
import { emergencyAccessFindByUuidAndGrantor } from "./emergencyAccessFindByUuidAndGrantor.js"
import type { EmergencyAccess } from "./emergencyAccess.js"
import { emergencyAccessInviteTokenCreate } from "./emergencyAccessInviteTokenCreate.js"
import { emergencyAccessInviteTokenDecode } from "./emergencyAccessInviteTokenDecode.js"
import type { EmergencyAccessNotificationAdapter } from "./emergencyAccessNotificationAdapter.js"
import { emergencyAccessNotificationAdapterCreate } from "./emergencyAccessNotificationAdapterCreate.js"
import { emergencyAccessNotificationSend } from "./emergencyAccessNotificationSend.js"
import type { EmergencyAccessRouteOptions } from "./emergencyAccessRouteOptions.js"
import { emergencyAccessSave } from "./emergencyAccessSave.js"
import { emergencyAccessToJson } from "./emergencyAccessToJson.js"

const emergencyAccessPathSchema = v.object({ emer_id: v.string() })
const emergencyAccessTypeSchema = v.union([v.number(), v.string()])
const emergencyAccessInviteSchema = v.object({
  email: v.string(),
  type: emergencyAccessTypeSchema,
  waitTimeDays: v.number(),
})
const emergencyAccessUpdateSchema = v.object({
  type: emergencyAccessTypeSchema,
  waitTimeDays: v.number(),
  keyEncrypted: v.optional(v.string()),
})
const emergencyAccessAcceptSchema = v.object({ token: v.string() })
const emergencyAccessConfirmSchema = v.object({ key: v.string() })
const emergencyAccessPasswordSchema = v.object({ newMasterPasswordHash: v.string(), key: v.string() })

const emergencyAccessStatus = {
  invited: 0,
  accepted: 1,
  confirmed: 2,
  recoveryInitiated: 3,
  recoveryApproved: 4,
} as const

export function emergencyAccessRoutesRegister(
  app: Hono<AuthenticationEnvironment>,
  options: EmergencyAccessRouteOptions,
): void {
  const notification = options.notification ?? emergencyAccessNotificationAdapterCreate()
  const authenticate = (routeName: string) =>
    authenticationMiddleware({
      clock: options.clock,
      database: options.database,
      publicKey: options.publicKey,
      publicOrigin: options.publicOrigin,
      routeName,
    })

  const trusted = (context: Context<AuthenticationEnvironment>) => {
    const requestResult = emergencyAccessRequestContextResolve(context, options)
    if (!requestResult.success) return apiErrorResponseCreate(requestResult)
    if (!options.config.EMERGENCY_ACCESS_ALLOWED) return context.json(emergencyAccessListJson([]))
    const accessesResult = emergencyAccessFindAllByGrantor(requestResult.data.database, requestResult.data.user.uuid)
    if (!accessesResult.success) return apiErrorResponseCreate(accessesResult)
    const data: Record<string, unknown>[] = []
    for (const access of accessesResult.data) {
      const detailsResult = emergencyAccessGranteeDetailsCreate(requestResult.data.database, access)
      if (!detailsResult.success) continue
      data.push(detailsResult.data)
    }
    return context.json(emergencyAccessListJson(data))
  }

  const granted = (context: Context<AuthenticationEnvironment>) => {
    const requestResult = emergencyAccessRequestContextResolve(context, options)
    if (!requestResult.success) return apiErrorResponseCreate(requestResult)
    if (!options.config.EMERGENCY_ACCESS_ALLOWED) return context.json(emergencyAccessListJson([]))
    const accessesResult = emergencyAccessFindAllByGrantee(requestResult.data.database, requestResult.data.user.uuid)
    if (!accessesResult.success) return apiErrorResponseCreate(accessesResult)
    const data: Record<string, unknown>[] = []
    for (const access of accessesResult.data) {
      const detailsResult = emergencyAccessGrantorDetailsCreate(requestResult.data.database, access)
      if (!detailsResult.success) return apiErrorResponseCreate(detailsResult)
      data.push(detailsResult.data)
    }
    return context.json(emergencyAccessListJson(data))
  }

  const get = (context: Context<AuthenticationEnvironment>) => {
    const requestResult = emergencyAccessRequestContextResolve(context, options)
    if (!requestResult.success) return apiErrorResponseCreate(requestResult)
    const enabledResult = emergencyAccessEnabledValidate(options, "emergencyAccessGet")
    if (!enabledResult.success) return apiErrorResponseCreate(enabledResult)
    const pathResult = requestPathParse(context, emergencyAccessPathSchema)
    if (!pathResult.success) return apiErrorResponseCreate(pathResult)
    const accessResult = emergencyAccessFindByUuidAndGrantor(
      requestResult.data.database,
      pathResult.data.emer_id,
      requestResult.data.user.uuid,
    )
    if (!accessResult.success) return apiErrorResponseCreate(accessResult)
    if (accessResult.data === null) return apiErrorResponseCreate(emergencyAccessInvalidError("emergencyAccessGet"))
    const detailsResult = emergencyAccessGranteeDetailsCreate(requestResult.data.database, accessResult.data)
    if (!detailsResult.success) return apiErrorResponseCreate(detailsResult)
    return context.json(detailsResult.data)
  }

  const update = async (context: Context<AuthenticationEnvironment>) => {
    const requestResult = emergencyAccessRequestContextResolve(context, options)
    if (!requestResult.success) return apiErrorResponseCreate(requestResult)
    const enabledResult = emergencyAccessEnabledValidate(options, "emergencyAccessUpdate")
    if (!enabledResult.success) return apiErrorResponseCreate(enabledResult)
    const pathResult = requestPathParse(context, emergencyAccessPathSchema)
    if (!pathResult.success) return apiErrorResponseCreate(pathResult)
    const bodyResult = await requestBodyParse(context, emergencyAccessUpdateSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const typeResult = emergencyAccessTypeResolve(bodyResult.data.type, "emergencyAccessUpdate")
    if (!typeResult.success) return apiErrorResponseCreate(typeResult)
    const accessResult = emergencyAccessFindByUuidAndGrantor(
      requestResult.data.database,
      pathResult.data.emer_id,
      requestResult.data.user.uuid,
    )
    if (!accessResult.success) return apiErrorResponseCreate(accessResult)
    if (accessResult.data === null) return apiErrorResponseCreate(emergencyAccessInvalidError("emergencyAccessUpdate"))
    const access = accessResult.data
    access.type = typeResult.data
    access.waitTimeDays = bodyResult.data.waitTimeDays
    if (bodyResult.data.keyEncrypted !== undefined) access.keyEncrypted = bodyResult.data.keyEncrypted
    const saveResult = emergencyAccessSave(requestResult.data.database, access, options.clock.now().toISOString())
    if (!saveResult.success) return apiErrorResponseCreate(saveResult)
    await emergencyAccessNotify(notification, "updated", access, [access.grantorUuid, access.granteeUuid])
    const jsonResult = emergencyAccessToJson(access)
    if (!jsonResult.success) return apiErrorResponseCreate(jsonResult)
    return context.json(jsonResult.data)
  }

  const remove = (context: Context<AuthenticationEnvironment>) => emergencyAccessRemove(context, options, notification)

  const invite = async (context: Context<AuthenticationEnvironment>) => {
    const requestResult = emergencyAccessRequestContextResolve(context, options)
    if (!requestResult.success) return apiErrorResponseCreate(requestResult)
    const enabledResult = emergencyAccessEnabledValidate(options, "emergencyAccessInvite")
    if (!enabledResult.success) return apiErrorResponseCreate(enabledResult)
    const bodyResult = await requestBodyParse(context, emergencyAccessInviteSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const typeResult = emergencyAccessTypeResolve(bodyResult.data.type, "emergencyAccessInvite")
    if (!typeResult.success) return apiErrorResponseCreate(typeResult)
    const email = bodyResult.data.email.toLowerCase()
    if (email === requestResult.data.user.email.toLowerCase())
      return apiErrorResponseCreate(
        emergencyAccessErrorCreate("emergencyAccessInvite", "You can not set yourself as an emergency contact."),
      )
    const userResult = identityUserFindByEmail(requestResult.data.database, email)
    if (!userResult.success) return apiErrorResponseCreate(userResult)
    let grantee = userResult.data
    let newUser = false
    if (grantee === null) {
      if (!options.config.INVITATIONS_ALLOWED)
        return apiErrorResponseCreate(
          emergencyAccessErrorCreate("emergencyAccessInvite", `Grantee user does not exist: ${email}`),
        )
      if (!emergencyAccessEmailDomainAllowed(options.config.SIGNUPS_DOMAINS_WHITELIST, email))
        return apiErrorResponseCreate(
          emergencyAccessErrorCreate("emergencyAccessInvite", "Email domain not eligible for invitations"),
        )
      const placeholderResult = emergencyAccessPlaceholderUserCreate(
        email,
        options.clock,
        options.identifier,
        options.config,
      )
      if (!placeholderResult.success) return apiErrorResponseCreate(placeholderResult)
      const saveUserResult = identityUserSave(requestResult.data.database, placeholderResult.data)
      if (!saveUserResult.success) return apiErrorResponseCreate(saveUserResult)
      grantee = placeholderResult.data
      newUser = true
      if (!options.config.MAIL_ENABLED) {
        const invitationResult = emergencyAccessInvitationSave(requestResult.data.database, email)
        if (!invitationResult.success) return apiErrorResponseCreate(invitationResult)
      }
    } else {
      newUser = grantee.passwordHash.byteLength === 0
    }
    const duplicateResult = emergencyAccessFindByGrantorAndGranteeOrEmail(
      requestResult.data.database,
      requestResult.data.user.uuid,
      grantee.uuid,
      grantee.email,
    )
    if (!duplicateResult.success) return apiErrorResponseCreate(duplicateResult)
    if (duplicateResult.data !== null)
      return apiErrorResponseCreate(
        emergencyAccessErrorCreate("emergencyAccessInvite", `Grantee user already invited: ${grantee.email}`),
      )
    const now = options.clock.now().toISOString()
    const access: EmergencyAccess = {
      uuid: options.identifier.uuid(),
      grantorUuid: requestResult.data.user.uuid,
      granteeUuid: null,
      email: grantee.email,
      keyEncrypted: null,
      type: typeResult.data,
      status: emergencyAccessStatus.invited,
      waitTimeDays: bodyResult.data.waitTimeDays,
      recoveryInitiatedAt: null,
      lastNotificationAt: null,
      updatedAt: now,
      createdAt: now,
    }
    if (!options.config.MAIL_ENABLED && !newUser) {
      access.status = emergencyAccessStatus.accepted
      access.granteeUuid = grantee.uuid
      access.email = null
    }
    let token: string | undefined
    if (options.config.MAIL_ENABLED) {
      const tokenResult = await emergencyAccessInviteTokenCreate(
        grantee.uuid,
        grantee.email,
        access.uuid,
        requestResult.data.user.name,
        requestResult.data.user.email,
        identityOriginResolve(options.publicOrigin, context.req.url),
        options.privateKey,
        options.clock,
        options.config.INVITATION_EXPIRATION_HOURS,
      )
      if (!tokenResult.success) return apiErrorResponseCreate(tokenResult)
      token = tokenResult.data
    }
    const saveResult = emergencyAccessSave(requestResult.data.database, access, now)
    if (!saveResult.success) return apiErrorResponseCreate(saveResult)
    if (token !== undefined) {
      const mailResult = await emergencyAccessMailCall(() =>
        options.mail.sendEmergencyAccessInvite?.(
          grantee?.email ?? email,
          grantee?.uuid ?? "",
          access.uuid,
          requestResult.data.user.name,
          requestResult.data.user.email,
          token ?? "",
        ),
      )
      if (!mailResult.success) return apiErrorResponseCreate(mailResult)
    }
    await emergencyAccessNotify(notification, "created", access, [access.grantorUuid, grantee.uuid])
    return new Response(null, { status: 200 })
  }

  const reinvite = async (context: Context<AuthenticationEnvironment>) => {
    const requestResult = emergencyAccessRequestContextResolve(context, options)
    if (!requestResult.success) return apiErrorResponseCreate(requestResult)
    const enabledResult = emergencyAccessEnabledValidate(options, "emergencyAccessReinvite")
    if (!enabledResult.success) return apiErrorResponseCreate(enabledResult)
    const pathResult = requestPathParse(context, emergencyAccessPathSchema)
    if (!pathResult.success) return apiErrorResponseCreate(pathResult)
    const accessResult = emergencyAccessFindByUuidAndGrantor(
      requestResult.data.database,
      pathResult.data.emer_id,
      requestResult.data.user.uuid,
    )
    if (!accessResult.success) return apiErrorResponseCreate(accessResult)
    if (accessResult.data === null)
      return apiErrorResponseCreate(emergencyAccessInvalidError("emergencyAccessReinvite"))
    const access = accessResult.data
    if (access.status !== emergencyAccessStatus.invited)
      return apiErrorResponseCreate(
        emergencyAccessErrorCreate(
          "emergencyAccessReinvite",
          "The grantee user is already accepted or confirmed to the organization",
        ),
      )
    if (access.email === null)
      return apiErrorResponseCreate(emergencyAccessErrorCreate("emergencyAccessReinvite", "Email not valid."))
    const granteeResult = identityUserFindByEmail(requestResult.data.database, access.email)
    if (!granteeResult.success) return apiErrorResponseCreate(granteeResult)
    if (granteeResult.data === null)
      return apiErrorResponseCreate(emergencyAccessErrorCreate("emergencyAccessReinvite", "Grantee user not found."))
    if (options.config.MAIL_ENABLED) {
      const tokenResult = await emergencyAccessInviteTokenCreate(
        granteeResult.data.uuid,
        access.email,
        access.uuid,
        requestResult.data.user.name,
        requestResult.data.user.email,
        identityOriginResolve(options.publicOrigin, context.req.url),
        options.privateKey,
        options.clock,
        options.config.INVITATION_EXPIRATION_HOURS,
      )
      if (!tokenResult.success) return apiErrorResponseCreate(tokenResult)
      const mailResult = await emergencyAccessMailCall(() =>
        options.mail.sendEmergencyAccessInvite?.(
          access.email ?? "",
          granteeResult.data?.uuid ?? "",
          access.uuid,
          requestResult.data.user.name,
          requestResult.data.user.email,
          tokenResult.data,
        ),
      )
      if (!mailResult.success) return apiErrorResponseCreate(mailResult)
    } else if (granteeResult.data.passwordHash.byteLength > 0) {
      access.status = emergencyAccessStatus.accepted
      access.granteeUuid = granteeResult.data.uuid
      access.email = null
      const saveResult = emergencyAccessSave(requestResult.data.database, access, options.clock.now().toISOString())
      if (!saveResult.success) return apiErrorResponseCreate(saveResult)
    } else if (options.config.INVITATIONS_ALLOWED) {
      const invitationResult = emergencyAccessInvitationSave(requestResult.data.database, access.email)
      if (!invitationResult.success) return apiErrorResponseCreate(invitationResult)
    }
    return new Response(null, { status: 200 })
  }

  const accept = async (context: Context<AuthenticationEnvironment>) => {
    const requestResult = emergencyAccessRequestContextResolve(context, options)
    if (!requestResult.success) return apiErrorResponseCreate(requestResult)
    const enabledResult = emergencyAccessEnabledValidate(options, "emergencyAccessAccept")
    if (!enabledResult.success) return apiErrorResponseCreate(enabledResult)
    const pathResult = requestPathParse(context, emergencyAccessPathSchema)
    if (!pathResult.success) return apiErrorResponseCreate(pathResult)
    const bodyResult = await requestBodyParse(context, emergencyAccessAcceptSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const claimsResult = await emergencyAccessInviteTokenDecode(
      bodyResult.data.token,
      identityOriginResolve(options.publicOrigin, context.req.url),
      options.publicKey,
      options.clock,
    )
    if (!claimsResult.success) return apiErrorResponseCreate(claimsResult)
    if (claimsResult.data.email !== requestResult.data.user.email)
      return apiErrorResponseCreate(
        emergencyAccessErrorCreate("emergencyAccessAccept", "Claim email does not match current users email"),
      )
    const accessResult = emergencyAccessFindByUuidAndEmail(
      requestResult.data.database,
      pathResult.data.emer_id,
      requestResult.data.user.email,
    )
    if (!accessResult.success) return apiErrorResponseCreate(accessResult)
    if (accessResult.data === null || claimsResult.data.emergencyAccessId !== pathResult.data.emer_id)
      return apiErrorResponseCreate(emergencyAccessErrorCreate("emergencyAccessAccept", "Emergency access not valid."))
    if (accessResult.data.status !== emergencyAccessStatus.invited)
      return apiErrorResponseCreate(emergencyAccessErrorCreate("emergencyAccessAccept", "Emergency access not valid."))
    const grantorResult = identityUserFindByUuid(requestResult.data.database, accessResult.data.grantorUuid)
    if (!grantorResult.success) return apiErrorResponseCreate(grantorResult)
    if (
      grantorResult.data === null ||
      grantorResult.data.name !== claimsResult.data.grantorName ||
      grantorResult.data.email !== claimsResult.data.grantorEmail
    )
      return apiErrorResponseCreate(
        emergencyAccessErrorCreate("emergencyAccessAccept", "Emergency access invitation error."),
      )
    const invitationResult = identityInvitationTake(requestResult.data.database, requestResult.data.user.email)
    if (!invitationResult.success) return apiErrorResponseCreate(invitationResult)
    const access = accessResult.data
    access.status = emergencyAccessStatus.accepted
    access.granteeUuid = requestResult.data.user.uuid
    access.email = null
    const saveResult = emergencyAccessSave(requestResult.data.database, access, options.clock.now().toISOString())
    if (!saveResult.success) return apiErrorResponseCreate(saveResult)
    if (options.config.MAIL_ENABLED) {
      const mailResult = await emergencyAccessMailCall(() =>
        options.mail.sendEmergencyAccessInviteAccepted?.(
          grantorResult.data?.email ?? "",
          requestResult.data.user.email,
        ),
      )
      if (!mailResult.success) return apiErrorResponseCreate(mailResult)
    }
    await emergencyAccessNotify(notification, "accepted", access, [access.grantorUuid, access.granteeUuid])
    return new Response(null, { status: 200 })
  }

  const confirm = async (context: Context<AuthenticationEnvironment>) => {
    const requestResult = emergencyAccessRequestContextResolve(context, options)
    if (!requestResult.success) return apiErrorResponseCreate(requestResult)
    const enabledResult = emergencyAccessEnabledValidate(options, "emergencyAccessConfirm")
    if (!enabledResult.success) return apiErrorResponseCreate(enabledResult)
    const pathResult = requestPathParse(context, emergencyAccessPathSchema)
    if (!pathResult.success) return apiErrorResponseCreate(pathResult)
    const bodyResult = await requestBodyParse(context, emergencyAccessConfirmSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const accessResult = emergencyAccessFindByUuidAndGrantor(
      requestResult.data.database,
      pathResult.data.emer_id,
      requestResult.data.user.uuid,
    )
    if (!accessResult.success) return apiErrorResponseCreate(accessResult)
    if (accessResult.data === null || accessResult.data.status !== emergencyAccessStatus.accepted)
      return apiErrorResponseCreate(emergencyAccessInvalidError("emergencyAccessConfirm"))
    const access = accessResult.data
    if (access.granteeUuid === null)
      return apiErrorResponseCreate(emergencyAccessErrorCreate("emergencyAccessConfirm", "Grantee user not found."))
    const granteeResult = identityUserFindByUuid(requestResult.data.database, access.granteeUuid)
    if (!granteeResult.success) return apiErrorResponseCreate(granteeResult)
    if (granteeResult.data === null)
      return apiErrorResponseCreate(emergencyAccessErrorCreate("emergencyAccessConfirm", "Grantee user not found."))
    access.status = emergencyAccessStatus.confirmed
    access.keyEncrypted = bodyResult.data.key
    access.email = null
    const saveResult = emergencyAccessSave(requestResult.data.database, access, options.clock.now().toISOString())
    if (!saveResult.success) return apiErrorResponseCreate(saveResult)
    if (options.config.MAIL_ENABLED) {
      const mailResult = await emergencyAccessMailCall(() =>
        options.mail.sendEmergencyAccessInviteConfirmed?.(
          granteeResult.data?.email ?? "",
          requestResult.data.user.name,
        ),
      )
      if (!mailResult.success) return apiErrorResponseCreate(mailResult)
    }
    await emergencyAccessNotify(notification, "confirmed", access, [access.grantorUuid, access.granteeUuid])
    const jsonResult = emergencyAccessToJson(access)
    if (!jsonResult.success) return apiErrorResponseCreate(jsonResult)
    return context.json(jsonResult.data)
  }

  const initiate = (context: Context<AuthenticationEnvironment>) =>
    emergencyAccessInitiate(context, options, notification)
  const approve = (context: Context<AuthenticationEnvironment>) =>
    emergencyAccessApprove(context, options, notification)
  const reject = (context: Context<AuthenticationEnvironment>) => emergencyAccessReject(context, options, notification)
  const view = (context: Context<AuthenticationEnvironment>) => emergencyAccessView(context, options)
  const takeover = (context: Context<AuthenticationEnvironment>) => emergencyAccessTakeover(context, options)
  const password = async (context: Context<AuthenticationEnvironment>) => emergencyAccessPassword(context, options)
  const policies = (context: Context<AuthenticationEnvironment>) => emergencyAccessPolicies(context, options)

  app.get("/api/emergency-access/trusted", authenticate("get_contacts"), trusted)
  app.get("/api/emergency-access/granted", authenticate("get_grantees"), granted)
  app.post("/api/emergency-access/invite", authenticate("send_invite"), invite)
  app.get("/api/emergency-access/:emer_id", authenticate("get_emergency_access"), get)
  app.put("/api/emergency-access/:emer_id", authenticate("put_emergency_access"), update)
  app.post("/api/emergency-access/:emer_id", authenticate("post_emergency_access"), update)
  app.delete("/api/emergency-access/:emer_id", authenticate("delete_emergency_access"), remove)
  app.post("/api/emergency-access/:emer_id/delete", authenticate("post_delete_emergency_access"), remove)
  app.post("/api/emergency-access/:emer_id/reinvite", authenticate("resend_invite"), reinvite)
  app.post("/api/emergency-access/:emer_id/accept", authenticate("accept_invite"), accept)
  app.post("/api/emergency-access/:emer_id/confirm", authenticate("confirm_emergency_access"), confirm)
  app.post("/api/emergency-access/:emer_id/initiate", authenticate("initiate_emergency_access"), initiate)
  app.post("/api/emergency-access/:emer_id/approve", authenticate("approve_emergency_access"), approve)
  app.post("/api/emergency-access/:emer_id/reject", authenticate("reject_emergency_access"), reject)
  app.post("/api/emergency-access/:emer_id/view", authenticate("view_emergency_access"), view)
  app.post("/api/emergency-access/:emer_id/takeover", authenticate("takeover_emergency_access"), takeover)
  app.post("/api/emergency-access/:emer_id/password", authenticate("password_emergency_access"), password)
  app.get("/api/emergency-access/:emer_id/policies", authenticate("policies_emergency_access"), policies)
}

async function emergencyAccessInitiate(
  context: Context<AuthenticationEnvironment>,
  options: EmergencyAccessRouteOptions,
  notification: EmergencyAccessNotificationAdapter,
): Promise<Response> {
  const requestResult = emergencyAccessRequestContextResolve(context, options)
  if (!requestResult.success) return apiErrorResponseCreate(requestResult)
  const enabledResult = emergencyAccessEnabledValidate(options, "emergencyAccessInitiate")
  if (!enabledResult.success) return apiErrorResponseCreate(enabledResult)
  const pathResult = requestPathParse(context, emergencyAccessPathSchema)
  if (!pathResult.success) return apiErrorResponseCreate(pathResult)
  const accessResult = emergencyAccessFindByUuidAndGrantee(
    requestResult.data.database,
    pathResult.data.emer_id,
    requestResult.data.user.uuid,
  )
  if (!accessResult.success) return apiErrorResponseCreate(accessResult)
  if (accessResult.data === null || accessResult.data.status !== emergencyAccessStatus.confirmed)
    return apiErrorResponseCreate(emergencyAccessInvalidError("emergencyAccessInitiate"))
  const grantorResult = identityUserFindByUuid(requestResult.data.database, accessResult.data.grantorUuid)
  if (!grantorResult.success) return apiErrorResponseCreate(grantorResult)
  if (grantorResult.data === null)
    return apiErrorResponseCreate(emergencyAccessErrorCreate("emergencyAccessInitiate", "Grantor user not found."))
  const access = accessResult.data
  const now = options.clock.now().toISOString()
  access.status = emergencyAccessStatus.recoveryInitiated
  access.updatedAt = now
  access.recoveryInitiatedAt = now
  access.lastNotificationAt = now
  const saveResult = emergencyAccessSave(requestResult.data.database, access, now)
  if (!saveResult.success) return apiErrorResponseCreate(saveResult)
  if (options.config.MAIL_ENABLED) {
    const mailResult = await emergencyAccessMailCall(() =>
      options.mail.sendEmergencyAccessRecoveryInitiated?.(
        grantorResult.data?.email ?? "",
        requestResult.data.user.name,
        emergencyAccessTypeName(access.type),
        access.waitTimeDays,
      ),
    )
    if (!mailResult.success) return apiErrorResponseCreate(mailResult)
  }
  await emergencyAccessNotify(notification, "initiated", access, [access.grantorUuid, access.granteeUuid])
  const jsonResult = emergencyAccessToJson(access)
  if (!jsonResult.success) return apiErrorResponseCreate(jsonResult)
  return context.json(jsonResult.data)
}

async function emergencyAccessApprove(
  context: Context<AuthenticationEnvironment>,
  options: EmergencyAccessRouteOptions,
  notification: EmergencyAccessNotificationAdapter,
): Promise<Response> {
  const requestResult = emergencyAccessRequestContextResolve(context, options)
  if (!requestResult.success) return apiErrorResponseCreate(requestResult)
  const enabledResult = emergencyAccessEnabledValidate(options, "emergencyAccessApprove")
  if (!enabledResult.success) return apiErrorResponseCreate(enabledResult)
  const pathResult = requestPathParse(context, emergencyAccessPathSchema)
  if (!pathResult.success) return apiErrorResponseCreate(pathResult)
  const accessResult = emergencyAccessFindByUuidAndGrantor(
    requestResult.data.database,
    pathResult.data.emer_id,
    requestResult.data.user.uuid,
  )
  if (!accessResult.success) return apiErrorResponseCreate(accessResult)
  if (accessResult.data === null || accessResult.data.status !== emergencyAccessStatus.recoveryInitiated)
    return apiErrorResponseCreate(emergencyAccessInvalidError("emergencyAccessApprove"))
  if (accessResult.data.granteeUuid === null)
    return apiErrorResponseCreate(emergencyAccessErrorCreate("emergencyAccessApprove", "Grantee user not found."))
  const granteeResult = identityUserFindByUuid(requestResult.data.database, accessResult.data.granteeUuid)
  if (!granteeResult.success) return apiErrorResponseCreate(granteeResult)
  if (granteeResult.data === null)
    return apiErrorResponseCreate(emergencyAccessErrorCreate("emergencyAccessApprove", "Grantee user not found."))
  const access = accessResult.data
  access.status = emergencyAccessStatus.recoveryApproved
  const saveResult = emergencyAccessSave(requestResult.data.database, access, options.clock.now().toISOString())
  if (!saveResult.success) return apiErrorResponseCreate(saveResult)
  if (options.config.MAIL_ENABLED) {
    const mailResult = await emergencyAccessMailCall(() =>
      options.mail.sendEmergencyAccessRecoveryApproved?.(granteeResult.data?.email ?? "", requestResult.data.user.name),
    )
    if (!mailResult.success) return apiErrorResponseCreate(mailResult)
  }
  await emergencyAccessNotify(notification, "approved", access, [access.grantorUuid, access.granteeUuid])
  const jsonResult = emergencyAccessToJson(access)
  if (!jsonResult.success) return apiErrorResponseCreate(jsonResult)
  return context.json(jsonResult.data)
}

async function emergencyAccessReject(
  context: Context<AuthenticationEnvironment>,
  options: EmergencyAccessRouteOptions,
  notification: EmergencyAccessNotificationAdapter,
): Promise<Response> {
  const requestResult = emergencyAccessRequestContextResolve(context, options)
  if (!requestResult.success) return apiErrorResponseCreate(requestResult)
  const enabledResult = emergencyAccessEnabledValidate(options, "emergencyAccessReject")
  if (!enabledResult.success) return apiErrorResponseCreate(enabledResult)
  const pathResult = requestPathParse(context, emergencyAccessPathSchema)
  if (!pathResult.success) return apiErrorResponseCreate(pathResult)
  const accessResult = emergencyAccessFindByUuidAndGrantor(
    requestResult.data.database,
    pathResult.data.emer_id,
    requestResult.data.user.uuid,
  )
  if (!accessResult.success) return apiErrorResponseCreate(accessResult)
  if (
    accessResult.data === null ||
    (accessResult.data.status !== emergencyAccessStatus.recoveryInitiated &&
      accessResult.data.status !== emergencyAccessStatus.recoveryApproved)
  )
    return apiErrorResponseCreate(emergencyAccessInvalidError("emergencyAccessReject"))
  if (accessResult.data.granteeUuid === null)
    return apiErrorResponseCreate(emergencyAccessErrorCreate("emergencyAccessReject", "Grantee user not found."))
  const granteeResult = identityUserFindByUuid(requestResult.data.database, accessResult.data.granteeUuid)
  if (!granteeResult.success) return apiErrorResponseCreate(granteeResult)
  if (granteeResult.data === null)
    return apiErrorResponseCreate(emergencyAccessErrorCreate("emergencyAccessReject", "Grantee user not found."))
  const access = accessResult.data
  access.status = emergencyAccessStatus.confirmed
  const saveResult = emergencyAccessSave(requestResult.data.database, access, options.clock.now().toISOString())
  if (!saveResult.success) return apiErrorResponseCreate(saveResult)
  if (options.config.MAIL_ENABLED) {
    const mailResult = await emergencyAccessMailCall(() =>
      options.mail.sendEmergencyAccessRecoveryRejected?.(granteeResult.data?.email ?? "", requestResult.data.user.name),
    )
    if (!mailResult.success) return apiErrorResponseCreate(mailResult)
  }
  await emergencyAccessNotify(notification, "rejected", access, [access.grantorUuid, access.granteeUuid])
  const jsonResult = emergencyAccessToJson(access)
  if (!jsonResult.success) return apiErrorResponseCreate(jsonResult)
  return context.json(jsonResult.data)
}

async function emergencyAccessView(
  context: Context<AuthenticationEnvironment>,
  options: EmergencyAccessRouteOptions,
): Promise<Response> {
  const requestResult = emergencyAccessRequestContextResolve(context, options)
  if (!requestResult.success) return apiErrorResponseCreate(requestResult)
  const enabledResult = emergencyAccessEnabledValidate(options, "emergencyAccessView")
  if (!enabledResult.success) return apiErrorResponseCreate(enabledResult)
  const accessResult = await emergencyAccessValidActionResolve(context, options, 0, "emergencyAccessView")
  if (!accessResult.success) return apiErrorResponseCreate(accessResult)
  const ciphersResult = cipherFindByUser(requestResult.data.database, accessResult.data.grantorUuid)
  if (!ciphersResult.success) return apiErrorResponseCreate(ciphersResult)
  const ciphers: Record<string, unknown>[] = []
  for (const cipher of ciphersResult.data) {
    const jsonResult = cipherToJson(requestResult.data.database, cipher, accessResult.data.grantorUuid)
    if (!jsonResult.success) return apiErrorResponseCreate(jsonResult)
    ciphers.push(jsonResult.data)
  }
  return context.json({ ciphers, keyEncrypted: accessResult.data.keyEncrypted, object: "emergencyAccessView" })
}

function emergencyAccessTakeover(
  context: Context<AuthenticationEnvironment>,
  options: EmergencyAccessRouteOptions,
): Response | Promise<Response> {
  return emergencyAccessTakeoverAsync(context, options)
}

async function emergencyAccessTakeoverAsync(
  context: Context<AuthenticationEnvironment>,
  options: EmergencyAccessRouteOptions,
): Promise<Response> {
  const requestResult = emergencyAccessRequestContextResolve(context, options)
  if (!requestResult.success) return apiErrorResponseCreate(requestResult)
  const enabledResult = emergencyAccessEnabledValidate(options, "emergencyAccessTakeover")
  if (!enabledResult.success) return apiErrorResponseCreate(enabledResult)
  const accessResult = await emergencyAccessValidActionResolve(context, options, 1, "emergencyAccessTakeover")
  if (!accessResult.success) return apiErrorResponseCreate(accessResult)
  const userResult = identityUserFindByUuid(requestResult.data.database, accessResult.data.grantorUuid)
  if (!userResult.success) return apiErrorResponseCreate(userResult)
  if (userResult.data === null)
    return apiErrorResponseCreate(emergencyAccessErrorCreate("emergencyAccessTakeover", "Grantor user not found."))
  return context.json({
    kdf: userResult.data.clientKdfType,
    kdfIterations: userResult.data.clientKdfIter,
    kdfMemory: userResult.data.clientKdfMemory,
    kdfParallelism: userResult.data.clientKdfParallelism,
    keyEncrypted: accessResult.data.keyEncrypted,
    object: "emergencyAccessTakeover",
  })
}

async function emergencyAccessPassword(
  context: Context<AuthenticationEnvironment>,
  options: EmergencyAccessRouteOptions,
): Promise<Response> {
  const requestResult = emergencyAccessRequestContextResolve(context, options)
  if (!requestResult.success) return apiErrorResponseCreate(requestResult)
  const enabledResult = emergencyAccessEnabledValidate(options, "emergencyAccessPassword")
  if (!enabledResult.success) return apiErrorResponseCreate(enabledResult)
  const bodyResult = await requestBodyParse(context, emergencyAccessPasswordSchema)
  if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
  const accessResult = await emergencyAccessValidActionResolve(context, options, 1, "emergencyAccessPassword")
  if (!accessResult.success) return apiErrorResponseCreate(accessResult)
  const userResult = identityUserFindByUuid(requestResult.data.database, accessResult.data.grantorUuid)
  if (!userResult.success) return apiErrorResponseCreate(userResult)
  if (userResult.data === null)
    return apiErrorResponseCreate(emergencyAccessErrorCreate("emergencyAccessPassword", "Grantor user not found."))
  const passwordResult = await identityUserPasswordSet(
    userResult.data,
    bodyResult.data.newMasterPasswordHash,
    bodyResult.data.key,
    {
      clock: options.clock,
      database: requestResult.data.database,
      identifier: options.identifier,
      resetSecurityStamp: true,
    },
  )
  if (!passwordResult.success) return apiErrorResponseCreate(passwordResult)
  userResult.data.updatedAt = options.clock.now().toISOString()
  const saveUserResult = identityUserSave(requestResult.data.database, userResult.data)
  if (!saveUserResult.success) return apiErrorResponseCreate(saveUserResult)
  try {
    requestResult.data.database.run("DELETE FROM users_organizations WHERE user_uuid = ? AND atype != 0", [
      userResult.data.uuid,
    ])
    requestResult.data.database.run("UPDATE devices SET twofactor_remember = NULL WHERE user_uuid = ?", [
      userResult.data.uuid,
    ])
  } catch {
    return apiErrorResponseCreate(
      emergencyAccessErrorCreate("emergencyAccessPassword", "Password takeover failed.", 500),
    )
  }
  return new Response(null, { status: 200 })
}

async function emergencyAccessPolicies(
  context: Context<AuthenticationEnvironment>,
  options: EmergencyAccessRouteOptions,
): Promise<Response> {
  const requestResult = emergencyAccessRequestContextResolve(context, options)
  if (!requestResult.success) return apiErrorResponseCreate(requestResult)
  const accessResult = await emergencyAccessValidActionResolve(context, options, 1, "emergencyAccessPolicies")
  if (!accessResult.success) return apiErrorResponseCreate(accessResult)
  return context.json(emergencyAccessListJson([]))
}

async function emergencyAccessRemove(
  context: Context<AuthenticationEnvironment>,
  options: EmergencyAccessRouteOptions,
  notification: EmergencyAccessNotificationAdapter,
): Promise<Response> {
  const requestResult = emergencyAccessRequestContextResolve(context, options)
  if (!requestResult.success) return apiErrorResponseCreate(requestResult)
  const enabledResult = emergencyAccessEnabledValidate(options, "emergencyAccessDelete")
  if (!enabledResult.success) return apiErrorResponseCreate(enabledResult)
  const pathResult = requestPathParse(context, emergencyAccessPathSchema)
  if (!pathResult.success) return apiErrorResponseCreate(pathResult)
  const grantorResult = emergencyAccessFindByUuidAndGrantor(
    requestResult.data.database,
    pathResult.data.emer_id,
    requestResult.data.user.uuid,
  )
  if (!grantorResult.success) return apiErrorResponseCreate(grantorResult)
  const granteeResult = emergencyAccessFindByUuidAndGrantee(
    requestResult.data.database,
    pathResult.data.emer_id,
    requestResult.data.user.uuid,
  )
  if (!granteeResult.success) return apiErrorResponseCreate(granteeResult)
  if ((grantorResult.data === null) === (granteeResult.data === null))
    return apiErrorResponseCreate(emergencyAccessInvalidError("emergencyAccessDelete"))
  const access = grantorResult.data ?? granteeResult.data
  if (access === null) return apiErrorResponseCreate(emergencyAccessInvalidError("emergencyAccessDelete"))
  const deleteResult = emergencyAccessDelete(
    requestResult.data.database,
    access.uuid,
    options.clock.now().toISOString(),
  )
  if (!deleteResult.success) return apiErrorResponseCreate(deleteResult)
  await emergencyAccessNotify(notification, "deleted", access, [access.grantorUuid, access.granteeUuid])
  return new Response(null, { status: 200 })
}

async function emergencyAccessValidActionResolve(
  context: Context<AuthenticationEnvironment>,
  options: EmergencyAccessRouteOptions,
  type: number,
  op: string,
): Promise<Result<EmergencyAccess>> {
  const requestResult = emergencyAccessRequestContextResolve(context, options)
  if (!requestResult.success) return requestResult
  const pathResult = requestPathParse(context, emergencyAccessPathSchema)
  if (!pathResult.success) return pathResult
  const accessResult = emergencyAccessFindByUuidAndGrantee(
    requestResult.data.database,
    pathResult.data.emer_id,
    requestResult.data.user.uuid,
  )
  if (!accessResult.success) return accessResult
  if (
    accessResult.data === null ||
    accessResult.data.status !== emergencyAccessStatus.recoveryApproved ||
    accessResult.data.type !== type
  )
    return emergencyAccessInvalidError(op)
  return resultCreate(accessResult.data)
}

function emergencyAccessRequestContextResolve(
  context: Context<AuthenticationEnvironment>,
  options: EmergencyAccessRouteOptions,
): Result<{
  database: NonNullable<EmergencyAccessRouteOptions["database"]>
  user: IdentityUser
  device: AuthenticationContext["device"]
}> {
  const authentication = authenticationContextGet(context)
  if (authentication === undefined)
    return apiErrorCreate("emergencyAccessAuthentication", "platform.unauthorized", "Authentication is required.")
  const database = options.database ?? context.get("database")
  if (database === undefined)
    return apiErrorCreate("emergencyAccessDatabase", "platform.internal", "Database unavailable.")
  return resultCreate({ database, user: authentication.user, device: authentication.device })
}

function emergencyAccessEnabledValidate(options: EmergencyAccessRouteOptions, op: string): Result<void> {
  if (!options.config.EMERGENCY_ACCESS_ALLOWED)
    return emergencyAccessErrorCreate(op, "Emergency access is not enabled.")
  return resultCreate(undefined)
}

function emergencyAccessTypeResolve(value: number | string, op: string): Result<number> {
  if (value === 0 || value === "0" || value === "View") return resultCreate(0)
  if (value === 1 || value === "1" || value === "Takeover") return resultCreate(1)
  return emergencyAccessErrorCreate(op, "Invalid emergency access type.")
}

function emergencyAccessTypeName(type: number): string {
  return type === 0 ? "View" : "Takeover"
}

function emergencyAccessInvalidError(op: string): ResultErr {
  return emergencyAccessErrorCreate(op, "Emergency access not valid.")
}

function emergencyAccessErrorCreate(op: string, message: string, statusCode = 400): ResultErr {
  const code =
    statusCode === 401
      ? "platform.unauthorized"
      : statusCode === 403
        ? "platform.forbidden"
        : statusCode === 404
          ? "platform.not-found"
          : statusCode === 500
            ? "platform.internal"
            : "platform.invalid-request"
  return apiErrorCreate(op, code, message)
}

function emergencyAccessListJson(data: Record<string, unknown>[]): Record<string, unknown> {
  return { data, object: "list", continuationToken: null }
}

function emergencyAccessEmailDomainAllowed(whitelistValue: string, email: string): boolean {
  const at = email.lastIndexOf("@")
  if (at <= 0 || at === email.length - 1) return false
  const whitelist = whitelistValue
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0)
  if (whitelist.length === 0) return true
  return whitelist.includes(email.slice(at + 1).toLowerCase())
}

function emergencyAccessPlaceholderUserCreate(
  email: string,
  clock: Clock,
  identifier: EmergencyAccessRouteOptions["identifier"],
  config: EmergencyAccessRouteOptions["config"],
): Result<IdentityUser> {
  const saltResult = secureRandomBytes(64)
  if (!saltResult.success) return saltResult
  const now = clock.now().toISOString()
  return resultCreate({
    uuid: identifier.uuid(),
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
    passwordIterations: config.PASSWORD_ITERATIONS,
    passwordHint: null,
    akey: "",
    privateKey: null,
    publicKey: null,
    securityStamp: identifier.uuid(),
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

function emergencyAccessInvitationSave(database: EmergencyAccessRouteOptions["database"], email: string): Result<void> {
  if (database === undefined)
    return emergencyAccessErrorCreate("emergencyAccessInvitationSave", "Database unavailable.", 500)
  try {
    database.run("INSERT INTO invitations (email) VALUES (?) ON CONFLICT(email) DO NOTHING", [email.toLowerCase()])
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate("emergencyAccessInvitationSave", "Invitation save failed.")
  }
}

async function emergencyAccessMailCall(
  call: (() => Promise<Result<void>> | undefined) | undefined,
): Promise<Result<void>> {
  if (call === undefined) return resultCreate(undefined)
  try {
    const result = await call()
    return result ?? resultCreate(undefined)
  } catch {
    return resultErrorCreate("emergencyAccessMailCall", "Emergency access mail failed.")
  }
}

async function emergencyAccessNotify(
  notification: EmergencyAccessNotificationAdapter,
  event:
    | "created"
    | "updated"
    | "deleted"
    | "accepted"
    | "confirmed"
    | "initiated"
    | "approved"
    | "rejected"
    | "reminder"
    | "timedOut",
  access: EmergencyAccess,
  userIds: Array<string | null>,
): Promise<void> {
  await emergencyAccessNotificationSend(notification, {
    event,
    emergencyAccessId: access.uuid,
    status: access.status,
    type: access.type,
    revisionDate: access.updatedAt,
    userIds: userIds.filter((value): value is string => value !== null),
  })
}

function emergencyAccessGranteeDetailsCreate(
  database: EmergencyAccessRouteOptions["database"] extends infer T ? NonNullable<T> : never,
  access: EmergencyAccess,
): Result<Record<string, unknown>> {
  const userResult =
    access.granteeUuid === null
      ? access.email === null
        ? resultCreate<IdentityUser | null>(null)
        : identityUserFindByEmail(database, access.email)
      : identityUserFindByUuid(database, access.granteeUuid)
  if (!userResult.success) return userResult
  if (userResult.data === null)
    return resultErrorCreate("emergencyAccessGranteeDetailsCreate", "Grantee user not found.")
  return resultCreate({
    id: access.uuid,
    status: access.status,
    type: access.type,
    waitTimeDays: access.waitTimeDays,
    granteeId: userResult.data.uuid,
    email: userResult.data.email,
    name: userResult.data.name,
    avatarColor: userResult.data.avatarColor,
    object: "emergencyAccessGranteeDetails",
  })
}

function emergencyAccessGrantorDetailsCreate(
  database: NonNullable<EmergencyAccessRouteOptions["database"]>,
  access: EmergencyAccess,
): Result<Record<string, unknown>> {
  const userResult = identityUserFindByUuid(database, access.grantorUuid)
  if (!userResult.success) return userResult
  if (userResult.data === null)
    return resultErrorCreate("emergencyAccessGrantorDetailsCreate", "Grantor user not found.")
  return resultCreate({
    id: access.uuid,
    status: access.status,
    type: access.type,
    waitTimeDays: access.waitTimeDays,
    grantorId: userResult.data.uuid,
    email: userResult.data.email,
    name: userResult.data.name,
    avatarColor: userResult.data.avatarColor,
    object: "emergencyAccessGrantorDetails",
  })
}
