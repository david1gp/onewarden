import type { Context, Hono } from "hono"
import type { Result } from "#result"
import { apiErrorCreate } from "../../../shared/api/apiErrorCreate.js"
import { apiErrorResponseCreate } from "../../../shared/api/apiErrorResponseCreate.js"
import { passwordHashVerify } from "../../../shared/crypto/passwordHashVerify.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { requestBodyParse } from "../../../shared/validation/requestBodyParse.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { AuthenticationContext } from "../authentication/authenticationContext.js"
import { authenticationContextGet } from "../authentication/authenticationContextGet.js"
import type { AuthenticationEnvironment } from "../authentication/authenticationEnvironment.js"
import { authenticationMiddlewareCreate } from "../authentication/authenticationMiddlewareCreate.js"
import { folderFindByUser } from "../folders/folderFindByUser.js"
import { folderUpdate } from "../folders/folderUpdate.js"
import { identityAccountAvatarDataSchema } from "./identityAccountAvatarDataSchema.js"
import { identityAccountChangeEmailDataSchema } from "./identityAccountChangeEmailDataSchema.js"
import { identityAccountDeleteRecover } from "./identityAccountDeleteRecover.js"
import { identityAccountDeleteRecoverDataSchema } from "./identityAccountDeleteRecoverDataSchema.js"
import { identityAccountDeleteRecoverTokenDataSchema } from "./identityAccountDeleteRecoverTokenDataSchema.js"
import { identityAccountEmailTokenDataSchema } from "./identityAccountEmailTokenDataSchema.js"
import { identityAccountKdfApply } from "./identityAccountKdfApply.js"
import { identityAccountKdfChangeDataSchema } from "./identityAccountKdfChangeDataSchema.js"
import { identityAccountKdfDataNormalize } from "./identityAccountKdfDataNormalize.js"
import { identityAccountKeysDataSchema } from "./identityAccountKeysDataSchema.js"
import { identityAccountPasswordDataSchema } from "./identityAccountPasswordDataSchema.js"
import { identityAccountPasswordHintDataSchema } from "./identityAccountPasswordHintDataSchema.js"
import type { IdentityAccountPasswordOrOtpData } from "./identityAccountPasswordOrOtpDataSchema.js"
import { identityAccountPasswordOrOtpDataSchema } from "./identityAccountPasswordOrOtpDataSchema.js"
import { identityAccountProfileDataSchema } from "./identityAccountProfileDataSchema.js"
import { identityAccountRotateKeysDataSchema } from "./identityAccountRotateKeysDataSchema.js"
import { identityAccountSetPasswordDataSchema } from "./identityAccountSetPasswordDataSchema.js"
import { identityAccountVerifyEmailTokenDataSchema } from "./identityAccountVerifyEmailTokenDataSchema.js"
import { identityAccountVerifyPasswordDataSchema } from "./identityAccountVerifyPasswordDataSchema.js"
import { identityApiKeyCreate } from "./identityApiKeyCreate.js"
import { identityDeleteAccountTokenDecode } from "./identityDeleteAccountTokenDecode.js"
import { identityDeviceDeleteAllByUser } from "./identityDeviceDeleteAllByUser.js"
import { identityDeviceFindByUser } from "./identityDeviceFindByUser.js"
import { identityDeviceFindByUuidAndUser } from "./identityDeviceFindByUuidAndUser.js"
import { identityDeviceRefreshTokensRotateByUser } from "./identityDeviceRefreshTokensRotateByUser.js"
import { identityDeviceToJson } from "./identityDeviceToJson.js"
import { identityDeviceWithAuthRequestToJson } from "./identityDeviceWithAuthRequestToJson.js"
import { identityDomainErrorCreate } from "./identityDomainErrorCreate.js"
import { identityEmailChangeComplete } from "./identityEmailChangeComplete.js"
import { identityEmailChangeRequest } from "./identityEmailChangeRequest.js"
import { identityEmailVerificationSend } from "./identityEmailVerificationSend.js"
import { identityOriginResolve } from "./identityOriginResolve.js"
import { identityPasswordHintSend } from "./identityPasswordHintSend.js"
import type { IdentityRouteOptions } from "./identityRouteOptions.js"
import { identityUserDelete } from "./identityUserDelete.js"
import { identityUserFindByEmail } from "./identityUserFindByEmail.js"
import { identityUserFindByUuid } from "./identityUserFindByUuid.js"
import { identityUserPasswordSet } from "./identityUserPasswordSet.js"
import { identityUserProfileToJson } from "./identityUserProfileToJson.js"
import { identityUserSave } from "./identityUserSave.js"
import { identityVerifyEmailTokenDecode } from "./identityVerifyEmailTokenDecode.js"
import { twoFactorPasswordOrOtpValidate } from "../twoFactor/twoFactorPasswordOrOtpValidate.js"
import { organizationMembershipFromRow } from "../organizations/organizationMembershipFromRow.js"
import type { OrganizationMembershipRow } from "../organizations/organizationMembershipRow.js"
import { organizationPolicyCheckUserAllowed } from "../organizations/organizationPolicyCheckUserAllowed.js"

export function identityAccountRoutesRegister(
  app: Hono<AuthenticationEnvironment>,
  options: IdentityRouteOptions,
): void {
  const authenticate = authenticationMiddlewareCreate({
    clock: options.clock,
    database: options.database,
    publicKey: options.publicKey,
    publicOrigin: options.publicOrigin,
  })

  const profile = (context: Context<AuthenticationEnvironment>) => {
    const requestContext = identityAccountRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    return context.json(
      identityUserProfileToJson(
        requestContext.data.authentication.user,
        options.config,
        requestContext.data.database,
        options.groupsEnabled,
      ),
    )
  }

  const updateProfile = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = identityAccountRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const bodyResult = await requestBodyParse(context, identityAccountProfileDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    if (new TextEncoder().encode(bodyResult.data.name).byteLength > 50)
      return apiErrorResponseCreate(
        identityDomainErrorCreate(
          "identityAccountProfile",
          "The field Name must be a string with a maximum length of 50.",
        ),
      )
    const user = requestContext.data.authentication.user
    user.name = bodyResult.data.name
    const saveResult = identityAccountUserSave(requestContext.data.database, user, options)
    if (!saveResult.success) return apiErrorResponseCreate(saveResult)
    return context.json(
      identityUserProfileToJson(user, options.config, requestContext.data.database, options.groupsEnabled),
    )
  }

  const updateAvatar = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = identityAccountRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const bodyResult = await requestBodyParse(context, identityAccountAvatarDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const avatarColor = bodyResult.data.avatarColor ?? null
    if (avatarColor !== null && new TextEncoder().encode(avatarColor).byteLength !== 7)
      return apiErrorResponseCreate(
        identityDomainErrorCreate(
          "identityAccountAvatar",
          "The field AvatarColor must be a HTML/Hex color code with a length of 7 characters",
        ),
      )
    const user = requestContext.data.authentication.user
    user.avatarColor = avatarColor
    const saveResult = identityAccountUserSave(requestContext.data.database, user, options)
    if (!saveResult.success) return apiErrorResponseCreate(saveResult)
    return context.json(
      identityUserProfileToJson(user, options.config, requestContext.data.database, options.groupsEnabled),
    )
  }

  const publicKey = (context: Context<AuthenticationEnvironment>) => {
    const requestContext = identityAccountRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const userId = context.req.param("user_id")
    if (userId === undefined)
      return apiErrorResponseCreate(identityAccountNotFoundError("identityAccountPublicKey", "User doesn't exist"))
    const userResult = identityUserFindByUuid(requestContext.data.database, userId)
    if (!userResult.success) return apiErrorResponseCreate(userResult)
    if (userResult.data === null)
      return apiErrorResponseCreate(identityAccountNotFoundError("identityAccountPublicKey", "User doesn't exist"))
    if (userResult.data.publicKey === null)
      return apiErrorResponseCreate(identityAccountNotFoundError("identityAccountPublicKey", "User has no public_key"))
    return context.json({
      userId: userResult.data.uuid,
      publicKey: userResult.data.publicKey,
      object: "userKey" as const,
    })
  }

  const keys = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = identityAccountRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const bodyResult = await requestBodyParse(context, identityAccountKeysDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const user = requestContext.data.authentication.user
    user.privateKey = bodyResult.data.encryptedPrivateKey
    user.publicKey = bodyResult.data.publicKey
    const saveResult = identityAccountUserSave(requestContext.data.database, user, options)
    if (!saveResult.success) return apiErrorResponseCreate(saveResult)
    return context.json({ privateKey: user.privateKey, publicKey: user.publicKey, object: "keys" as const })
  }

  const setPassword = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = identityAccountRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const bodyResult = await requestBodyParse(context, identityAccountSetPasswordDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const user = requestContext.data.authentication.user
    if (user.privateKey !== null)
      return apiErrorResponseCreate(
        identityDomainErrorCreate("identityAccountSetPassword", "Account already initialized, cannot set password"),
      )
    const hintResult = identityAccountPasswordHintNormalize(bodyResult.data.masterPasswordHint, options)
    if (!hintResult.success) return apiErrorResponseCreate(hintResult)
    const kdfResult = identityAccountKdfDataNormalize(bodyResult.data)
    if (!kdfResult.success) return apiErrorResponseCreate(kdfResult)
    const applyResult = identityAccountKdfApply(user, kdfResult.data)
    if (!applyResult.success) return apiErrorResponseCreate(applyResult)
    const passwordResult = await identityUserPasswordSet(
      user,
      bodyResult.data.masterPasswordHash,
      bodyResult.data.key,
      {
        clock: options.clock,
        database: requestContext.data.database,
        identifier: options.identifier,
        resetSecurityStamp: false,
        stampExceptionRoutes: ["revision_date"],
      },
    )
    if (!passwordResult.success) return apiErrorResponseCreate(passwordResult)
    user.passwordHint = hintResult.data
    if (bodyResult.data.keys !== undefined && bodyResult.data.keys !== null) {
      user.privateKey = bodyResult.data.keys.encryptedPrivateKey
      user.publicKey = bodyResult.data.keys.publicKey
    }
    const organizationResult = identityAccountOrganizationInviteAccept(
      requestContext.data.database,
      user.uuid,
      bodyResult.data.orgIdentifier,
    )
    if (!organizationResult.success) return apiErrorResponseCreate(organizationResult)
    if (!options.config.MAIL_ENABLED) {
      try {
        requestContext.data.database.run(
          "UPDATE users_organizations SET status = 1 WHERE user_uuid = ? AND status = 0",
          [user.uuid],
        )
      } catch {
        return apiErrorResponseCreate(
          identityDomainErrorCreate("identityAccountSetPassword", "Invitation acceptance failed"),
        )
      }
    }
    const saveResult = identityAccountUserSave(requestContext.data.database, user, options)
    if (!saveResult.success) return apiErrorResponseCreate(saveResult)
    return context.json({ object: "set-password" as const, captchaBypassToken: "" })
  }

  const changePassword = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = identityAccountRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const bodyResult = await requestBodyParse(context, identityAccountPasswordDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const user = requestContext.data.authentication.user
    const currentPasswordResult = await identityAccountPasswordVerify(user, bodyResult.data.masterPasswordHash)
    if (!currentPasswordResult.success) return apiErrorResponseCreate(currentPasswordResult)
    if (!currentPasswordResult.data)
      return apiErrorResponseCreate(identityDomainErrorCreate("identityAccountPassword", "Invalid password"))

    let newPasswordHash: string | undefined
    let newAkey: string | undefined
    const hasAuthenticationData =
      bodyResult.data.authenticationData !== undefined && bodyResult.data.authenticationData !== null
    const hasUnlockData = bodyResult.data.unlockData !== undefined && bodyResult.data.unlockData !== null
    if (hasAuthenticationData && hasUnlockData) {
      const authenticationData = bodyResult.data.authenticationData
      const unlockData = bodyResult.data.unlockData
      if (
        authenticationData === undefined ||
        authenticationData === null ||
        unlockData === undefined ||
        unlockData === null
      )
        return apiErrorResponseCreate(identityDomainErrorCreate("identityAccountPassword", "Invalid request!"))
      const authenticationKdfResult = identityAccountKdfDataNormalize(authenticationData.kdf)
      if (!authenticationKdfResult.success) return apiErrorResponseCreate(authenticationKdfResult)
      const unlockKdfResult = identityAccountKdfDataNormalize(unlockData.kdf)
      if (!unlockKdfResult.success) return apiErrorResponseCreate(unlockKdfResult)
      if (!identityAccountKdfEqual(authenticationKdfResult.data, unlockKdfResult.data))
        return apiErrorResponseCreate(
          identityDomainErrorCreate(
            "identityAccountPassword",
            "KDF settings must be equal for authentication and unlock",
          ),
        )
      if (user.email !== authenticationData.salt || user.email !== unlockData.salt)
        return apiErrorResponseCreate(
          identityDomainErrorCreate("identityAccountPassword", "Invalid master password salt"),
        )
      newPasswordHash = authenticationData.masterPasswordAuthenticationHash
      newAkey = unlockData.masterKeyWrappedUserKey
    } else if (
      !hasAuthenticationData &&
      !hasUnlockData &&
      bodyResult.data.newMasterPasswordHash !== undefined &&
      bodyResult.data.newMasterPasswordHash !== null &&
      bodyResult.data.key !== undefined &&
      bodyResult.data.key !== null
    ) {
      newPasswordHash = bodyResult.data.newMasterPasswordHash
      newAkey = bodyResult.data.key
    } else {
      return apiErrorResponseCreate(identityDomainErrorCreate("identityAccountPassword", "Invalid request!"))
    }

    const hintResult = identityAccountPasswordHintNormalize(bodyResult.data.masterPasswordHint, options)
    if (!hintResult.success) return apiErrorResponseCreate(hintResult)
    if (newPasswordHash === undefined || newAkey === undefined)
      return apiErrorResponseCreate(identityDomainErrorCreate("identityAccountPassword", "Invalid request!"))
    user.passwordHint = hintResult.data
    const passwordResult = await identityUserPasswordSet(user, newPasswordHash, newAkey, {
      clock: options.clock,
      database: requestContext.data.database,
      identifier: options.identifier,
      resetSecurityStamp: true,
      stampExceptionRoutes: ["post_rotatekey", "get_contacts", "get_public_keys", "get_api_webauthn"],
    })
    if (!passwordResult.success) return apiErrorResponseCreate(passwordResult)
    const saveResult = identityAccountUserSave(requestContext.data.database, user, options)
    if (!saveResult.success) return apiErrorResponseCreate(saveResult)
    return new Response(null, { status: 200 })
  }

  const changeKdf = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = identityAccountRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const bodyResult = await requestBodyParse(context, identityAccountKdfChangeDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const user = requestContext.data.authentication.user
    const currentPasswordResult = await identityAccountPasswordVerify(user, bodyResult.data.masterPasswordHash)
    if (!currentPasswordResult.success) return apiErrorResponseCreate(currentPasswordResult)
    if (!currentPasswordResult.data)
      return apiErrorResponseCreate(identityDomainErrorCreate("identityAccountKdf", "Invalid password"))
    const authenticationKdfResult = identityAccountKdfDataNormalize(bodyResult.data.authenticationData.kdf)
    if (!authenticationKdfResult.success) return apiErrorResponseCreate(authenticationKdfResult)
    const unlockKdfResult = identityAccountKdfDataNormalize(bodyResult.data.unlockData.kdf)
    if (!unlockKdfResult.success) return apiErrorResponseCreate(unlockKdfResult)
    if (!identityAccountKdfEqual(authenticationKdfResult.data, unlockKdfResult.data))
      return apiErrorResponseCreate(
        identityDomainErrorCreate("identityAccountKdf", "KDF settings must be equal for authentication and unlock"),
      )
    if (user.email !== bodyResult.data.authenticationData.salt || user.email !== bodyResult.data.unlockData.salt)
      return apiErrorResponseCreate(identityDomainErrorCreate("identityAccountKdf", "Invalid master password salt"))
    const applyResult = identityAccountKdfApply(user, unlockKdfResult.data)
    if (!applyResult.success) return apiErrorResponseCreate(applyResult)
    const passwordResult = await identityUserPasswordSet(
      user,
      bodyResult.data.authenticationData.masterPasswordAuthenticationHash,
      bodyResult.data.unlockData.masterKeyWrappedUserKey,
      {
        clock: options.clock,
        database: requestContext.data.database,
        identifier: options.identifier,
        resetSecurityStamp: true,
      },
    )
    if (!passwordResult.success) return apiErrorResponseCreate(passwordResult)
    const saveResult = identityAccountUserSave(requestContext.data.database, user, options)
    if (!saveResult.success) return apiErrorResponseCreate(saveResult)
    return new Response(null, { status: 200 })
  }

  const rotateKeys = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = identityAccountRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const bodyResult = await requestBodyParse(context, identityAccountRotateKeysDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const user = requestContext.data.authentication.user
    const currentPasswordResult = await identityAccountPasswordVerify(
      user,
      bodyResult.data.oldMasterKeyAuthenticationHash,
    )
    if (!currentPasswordResult.success) return apiErrorResponseCreate(currentPasswordResult)
    if (!currentPasswordResult.data)
      return apiErrorResponseCreate(identityDomainErrorCreate("identityAccountRotateKeys", "Invalid password"))
    if (bodyResult.data.accountData.ciphers.length > 0)
      return apiErrorResponseCreate(identityDomainErrorCreate("identityAccountRotateKeys", "Cipher doesn't exist"))
    if (bodyResult.data.accountData.sends.length > 0)
      return apiErrorResponseCreate(identityDomainErrorCreate("identityAccountRotateKeys", "Send doesn't exist"))
    if (bodyResult.data.accountUnlockData.emergencyAccessUnlockData.length > 0)
      return apiErrorResponseCreate(
        identityDomainErrorCreate(
          "identityAccountRotateKeys",
          "Emergency access doesn't exist or is not owned by the user",
        ),
      )

    const unlockData = bodyResult.data.accountUnlockData.masterPasswordUnlockData
    const unlockKdf = {
      kdf: unlockData.kdfType,
      kdfIterations: unlockData.kdfIterations,
      kdfMemory: unlockData.kdfMemory ?? null,
      kdfParallelism: unlockData.kdfParallelism ?? null,
    }
    if (
      user.clientKdfType !== unlockKdf.kdf ||
      user.clientKdfIter !== unlockKdf.kdfIterations ||
      user.clientKdfMemory !== unlockKdf.kdfMemory ||
      user.clientKdfParallelism !== unlockKdf.kdfParallelism ||
      user.email !== unlockData.email
    )
      return apiErrorResponseCreate(
        identityDomainErrorCreate(
          "identityAccountRotateKeys",
          "Changing the kdf variant or email is not supported during key rotation",
        ),
      )
    if (user.publicKey !== bodyResult.data.accountKeys.accountPublicKey)
      return apiErrorResponseCreate(
        identityDomainErrorCreate(
          "identityAccountRotateKeys",
          "Changing the asymmetric keypair is not possible during key rotation",
        ),
      )

    const foldersResult = folderFindByUser(requestContext.data.database, user.uuid)
    if (!foldersResult.success) return apiErrorResponseCreate(foldersResult)
    const providedFolderIds = new Set(
      bodyResult.data.accountData.folders.flatMap((folder) =>
        folder.id === undefined || folder.id === null ? [] : [folder.id],
      ),
    )
    for (const folder of foldersResult.data) {
      if (!providedFolderIds.has(folder.uuid))
        return apiErrorResponseCreate(
          identityDomainErrorCreate(
            "identityAccountRotateKeys",
            "All existing folders must be included in the rotation",
          ),
        )
    }
    let memberships: Array<{ org_uuid: string }>
    try {
      memberships = requestContext.data.database
        .query<{ org_uuid: string }, [string]>(
          "SELECT org_uuid FROM users_organizations WHERE user_uuid = ? AND reset_password_key IS NOT NULL",
        )
        .all(user.uuid)
    } catch {
      return apiErrorResponseCreate(
        identityDomainErrorCreate("identityAccountRotateKeys", "Reset password lookup failed"),
      )
    }
    const providedOrganizationIds = new Set(
      bodyResult.data.accountUnlockData.organizationAccountRecoveryUnlockData.map((item) => item.organizationId),
    )
    for (const membership of memberships) {
      if (!providedOrganizationIds.has(membership.org_uuid))
        return apiErrorResponseCreate(
          identityDomainErrorCreate(
            "identityAccountRotateKeys",
            "All existing reset password keys must be included in the rotation",
          ),
        )
    }
    for (const folder of bodyResult.data.accountData.folders) {
      if (folder.id === undefined || folder.id === null) continue
      const updateResult = folderUpdate(requestContext.data.database, folder.id, user.uuid, folder.name, options.clock)
      if (!updateResult.success)
        return apiErrorResponseCreate(identityDomainErrorCreate("identityAccountRotateKeys", "Folder doesn't exist"))
    }
    try {
      for (const item of bodyResult.data.accountUnlockData.organizationAccountRecoveryUnlockData) {
        const membership = memberships.find((candidate) => candidate.org_uuid === item.organizationId)
        if (membership === undefined)
          return apiErrorResponseCreate(
            identityDomainErrorCreate("identityAccountRotateKeys", "Reset password doesn't exist"),
          )
        requestContext.data.database.run(
          "UPDATE users_organizations SET reset_password_key = ? WHERE user_uuid = ? AND org_uuid = ?",
          [item.resetPasswordKey, user.uuid, item.organizationId],
        )
      }
    } catch {
      return apiErrorResponseCreate(
        identityDomainErrorCreate("identityAccountRotateKeys", "Reset password update failed"),
      )
    }
    user.privateKey = bodyResult.data.accountKeys.userKeyEncryptedAccountPrivateKey
    const passwordResult = await identityUserPasswordSet(
      user,
      unlockData.masterKeyAuthenticationHash,
      unlockData.masterKeyEncryptedUserKey,
      {
        clock: options.clock,
        database: requestContext.data.database,
        identifier: options.identifier,
        resetSecurityStamp: true,
      },
    )
    if (!passwordResult.success) return apiErrorResponseCreate(passwordResult)
    const saveResult = identityAccountUserSave(requestContext.data.database, user, options)
    if (!saveResult.success) return apiErrorResponseCreate(saveResult)
    return new Response(null, { status: 200 })
  }

  const securityStamp = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = identityAccountRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const bodyResult = await requestBodyParse(context, identityAccountPasswordOrOtpDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const validationResult = await identityAccountPasswordOrOtpValidate(
      requestContext.data.authentication.user,
      bodyResult.data,
      requestContext.data.database,
      options,
    )
    if (!validationResult.success) return apiErrorResponseCreate(validationResult)
    const user = requestContext.data.authentication.user
    user.securityStamp = options.identifier.uuid()
    const rotateResult = identityDeviceRefreshTokensRotateByUser(requestContext.data.database, user.uuid, options.clock)
    if (!rotateResult.success) return apiErrorResponseCreate(rotateResult)
    const saveResult = identityAccountUserSave(requestContext.data.database, user, options)
    const deleteResult = identityDeviceDeleteAllByUser(requestContext.data.database, user.uuid)
    if (!saveResult.success) return apiErrorResponseCreate(saveResult)
    if (!deleteResult.success) return apiErrorResponseCreate(deleteResult)
    return new Response(null, { status: 200 })
  }

  const deleteAccount = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = identityAccountRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const bodyResult = await requestBodyParse(context, identityAccountPasswordOrOtpDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const validationResult = await identityAccountPasswordOrOtpValidate(
      requestContext.data.authentication.user,
      bodyResult.data,
      requestContext.data.database,
      options,
    )
    if (!validationResult.success) return apiErrorResponseCreate(validationResult)
    const deleteResult = identityUserDelete(requestContext.data.database, requestContext.data.authentication.user)
    if (!deleteResult.success) return apiErrorResponseCreate(deleteResult)
    return new Response(null, { status: 200 })
  }

  const requestEmailToken = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = identityAccountRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const bodyResult = await requestBodyParse(context, identityAccountEmailTokenDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const result = await identityEmailChangeRequest(requestContext.data.authentication.user, bodyResult.data, {
      clock: options.clock,
      config: options.config,
      database: requestContext.data.database,
      mail: options.mail,
    })
    if (!result.success) return apiErrorResponseCreate(result)
    return new Response(null, { status: 200 })
  }

  const completeEmailChange = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = identityAccountRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const bodyResult = await requestBodyParse(context, identityAccountChangeEmailDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const result = await identityEmailChangeComplete(requestContext.data.authentication.user, bodyResult.data, {
      clock: options.clock,
      config: options.config,
      database: requestContext.data.database,
      identifier: options.identifier,
    })
    if (!result.success) return apiErrorResponseCreate(result)
    return new Response(null, { status: 200 })
  }

  const sendEmailVerification = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = identityAccountRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const result = await identityEmailVerificationSend(requestContext.data.authentication.user, {
      clock: options.clock,
      config: options.config,
      issuer: identityOriginResolve(options.publicOrigin, context.req.url),
      mail: options.mail,
      privateKey: options.privateKey,
    })
    if (!result.success) return apiErrorResponseCreate(result)
    return new Response(null, { status: 200 })
  }

  const verifyEmail = async (context: Context<AuthenticationEnvironment>) => {
    const database = options.database ?? context.get("database")
    if (database === undefined)
      return apiErrorResponseCreate(
        apiErrorCreate("identityAccountVerifyEmail", "platform.internal", "Database unavailable."),
      )
    const bodyResult = await requestBodyParse(context, identityAccountVerifyEmailTokenDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const userResult = identityUserFindByUuid(database, bodyResult.data.userId)
    if (!userResult.success) return apiErrorResponseCreate(userResult)
    if (userResult.data === null)
      return apiErrorResponseCreate(identityDomainErrorCreate("identityAccountVerifyEmail", "User doesn't exist"))
    const claimsResult = await identityVerifyEmailTokenDecode(
      bodyResult.data.token,
      identityOriginResolve(options.publicOrigin, context.req.url),
      options.publicKey,
      options.clock,
    )
    if (!claimsResult.success || claimsResult.data.sub !== bodyResult.data.userId)
      return apiErrorResponseCreate(identityDomainErrorCreate("identityAccountVerifyEmail", "Invalid claim"))
    const user = userResult.data
    user.verifiedAt = options.clock.now().toISOString()
    user.lastVerifyingAt = null
    user.loginVerifyCount = 0
    user.updatedAt = options.clock.now().toISOString()
    const saveResult = identityUserSave(database, user)
    if (!saveResult.success) return apiErrorResponseCreate(saveResult)
    return new Response(null, { status: 200 })
  }

  const requestAccountDelete = async (context: Context<AuthenticationEnvironment>) => {
    const rateLimitResult = options.rateLimiter.check(identityAccountClientIpResolve(context))
    if (!rateLimitResult.success) return apiErrorResponseCreate(rateLimitResult)
    const database = options.database ?? context.get("database")
    if (database === undefined)
      return apiErrorResponseCreate(
        apiErrorCreate("identityAccountDeleteRecover", "platform.internal", "Database unavailable."),
      )
    const bodyResult = await requestBodyParse(context, identityAccountDeleteRecoverDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const result = await identityAccountDeleteRecover(bodyResult.data.email, {
      clock: options.clock,
      config: options.config,
      database,
      issuer: identityOriginResolve(options.publicOrigin, context.req.url),
      mail: options.mail,
      privateKey: options.privateKey,
    })
    if (!result.success) return apiErrorResponseCreate(result)
    return new Response(null, { status: 200 })
  }

  const completeAccountDelete = async (context: Context<AuthenticationEnvironment>) => {
    const database = options.database ?? context.get("database")
    if (database === undefined)
      return apiErrorResponseCreate(
        apiErrorCreate("identityAccountDeleteRecoverToken", "platform.internal", "Database unavailable."),
      )
    const bodyResult = await requestBodyParse(context, identityAccountDeleteRecoverTokenDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const userResult = identityUserFindByUuid(database, bodyResult.data.userId)
    if (!userResult.success) return apiErrorResponseCreate(userResult)
    if (userResult.data === null)
      return apiErrorResponseCreate(
        identityDomainErrorCreate("identityAccountDeleteRecoverToken", "User doesn't exist"),
      )
    const claimsResult = await identityDeleteAccountTokenDecode(
      bodyResult.data.token,
      identityOriginResolve(options.publicOrigin, context.req.url),
      options.publicKey,
      options.clock,
    )
    if (!claimsResult.success)
      return apiErrorResponseCreate(identityDomainErrorCreate("identityAccountDeleteRecoverToken", "Invalid claim"))
    if (claimsResult.data.sub !== bodyResult.data.userId)
      return apiErrorResponseCreate(identityDomainErrorCreate("identityAccountDeleteRecoverToken", "Invalid claim"))
    const deleteResult = identityUserDelete(database, userResult.data)
    if (!deleteResult.success) return apiErrorResponseCreate(deleteResult)
    return new Response(null, { status: 200 })
  }

  const passwordHint = async (context: Context<AuthenticationEnvironment>) => {
    const rateLimitResult = options.rateLimiter.check(identityAccountClientIpResolve(context))
    if (!rateLimitResult.success) return apiErrorResponseCreate(rateLimitResult)
    const database = options.database ?? context.get("database")
    if (database === undefined)
      return apiErrorResponseCreate(
        apiErrorCreate("identityAccountPasswordHint", "platform.internal", "Database unavailable."),
      )
    const bodyResult = await requestBodyParse(context, identityAccountPasswordHintDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const result = await identityPasswordHintSend(bodyResult.data.email, {
      config: options.config,
      database,
      mail: options.mail,
    })
    if (!result.success) return apiErrorResponseCreate(result)
    return new Response(null, { status: 200 })
  }

  const revisionDate = (context: Context<AuthenticationEnvironment>) => {
    const requestContext = identityAccountRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    return context.json(new Date(requestContext.data.authentication.user.updatedAt).getTime())
  }

  const verifyPassword = async (context: Context<AuthenticationEnvironment>) => {
    const requestContext = identityAccountRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const bodyResult = await requestBodyParse(context, identityAccountVerifyPasswordDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const user = requestContext.data.authentication.user
    const passwordResult = await identityAccountPasswordVerify(user, bodyResult.data.masterPasswordHash)
    if (!passwordResult.success) return apiErrorResponseCreate(passwordResult)
    if (!passwordResult.data)
      return apiErrorResponseCreate(identityDomainErrorCreate("identityAccountVerifyPassword", "Invalid password"))
    if (user.passwordIterations < options.config.PASSWORD_ITERATIONS) {
      user.passwordIterations = options.config.PASSWORD_ITERATIONS
      const upgradeResult = await identityUserPasswordSet(user, bodyResult.data.masterPasswordHash, undefined, {
        clock: options.clock,
        database: requestContext.data.database,
        identifier: options.identifier,
        resetSecurityStamp: false,
      })
      if (!upgradeResult.success) return apiErrorResponseCreate(upgradeResult)
      const saveResult = identityAccountUserSave(requestContext.data.database, user, options)
      if (!saveResult.success) return apiErrorResponseCreate(saveResult)
    }
    return context.json({ Object: "masterPasswordPolicy" as const })
  }

  const updateApiKey = async (context: Context<AuthenticationEnvironment>, rotate: boolean) => {
    const requestContext = identityAccountRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const bodyResult = await requestBodyParse(context, identityAccountPasswordOrOtpDataSchema)
    if (!bodyResult.success) return apiErrorResponseCreate(bodyResult)
    const validationResult = await identityAccountPasswordOrOtpValidate(
      requestContext.data.authentication.user,
      bodyResult.data,
      requestContext.data.database,
      options,
    )
    if (!validationResult.success) return apiErrorResponseCreate(validationResult)
    const user = requestContext.data.authentication.user
    if (rotate || user.apiKey === null) {
      const apiKeyResult = identityApiKeyCreate()
      if (!apiKeyResult.success) return apiErrorResponseCreate(apiKeyResult)
      user.apiKey = apiKeyResult.data
      const saveResult = identityAccountUserSave(requestContext.data.database, user, options)
      if (!saveResult.success) return apiErrorResponseCreate(saveResult)
    }
    return context.json({ apiKey: user.apiKey, revisionDate: user.updatedAt, object: "apiKey" as const })
  }

  const knownDevice = (context: Context<AuthenticationEnvironment>) => {
    const encodedEmail = context.req.header("X-Request-Email")
    if (encodedEmail === undefined)
      return apiErrorResponseCreate(
        identityDomainErrorCreate("identityAccountKnownDevice", "X-Request-Email value is required"),
      )
    const encodedDevice = context.req.header("X-Device-Identifier")
    if (encodedDevice === undefined)
      return apiErrorResponseCreate(
        identityDomainErrorCreate("identityAccountKnownDevice", "X-Device-Identifier value is required"),
      )
    const emailResult = identityAccountKnownDeviceEmailDecode(encodedEmail)
    if (!emailResult.success) return apiErrorResponseCreate(emailResult)
    const database = options.database ?? context.get("database")
    if (database === undefined)
      return apiErrorResponseCreate(
        apiErrorCreate("identityAccountKnownDevice", "platform.internal", "Database unavailable."),
      )
    const userResult = identityUserFindByEmail(database, emailResult.data)
    if (!userResult.success) return apiErrorResponseCreate(userResult)
    if (userResult.data === null) return context.json(false)
    const deviceResult = identityDeviceFindByUuidAndUser(database, encodedDevice, userResult.data.uuid)
    if (!deviceResult.success) return apiErrorResponseCreate(deviceResult)
    return context.json(deviceResult.data !== null)
  }

  const devices = (context: Context<AuthenticationEnvironment>) => {
    const requestContext = identityAccountRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const devicesResult = identityDeviceFindByUser(
      requestContext.data.database,
      requestContext.data.authentication.user.uuid,
    )
    if (!devicesResult.success) return apiErrorResponseCreate(devicesResult)
    return context.json({
      data: devicesResult.data.map(identityDeviceWithAuthRequestToJson),
      continuationToken: null,
      object: "list" as const,
    })
  }

  const device = (context: Context<AuthenticationEnvironment>) => {
    const requestContext = identityAccountRequestContextResolve(context, options)
    if (!requestContext.success) return apiErrorResponseCreate(requestContext)
    const deviceId = context.req.param("device_id")
    if (deviceId === undefined)
      return apiErrorResponseCreate(identityDomainErrorCreate("identityAccountDevice", "No device found"))
    const deviceResult = identityDeviceFindByUuidAndUser(
      requestContext.data.database,
      deviceId,
      requestContext.data.authentication.user.uuid,
    )
    if (!deviceResult.success) return apiErrorResponseCreate(deviceResult)
    if (deviceResult.data === null)
      return apiErrorResponseCreate(identityDomainErrorCreate("identityAccountDevice", "No device found"))
    return context.json(identityDeviceToJson(deviceResult.data))
  }

  app.post("/api/accounts/set-password", authenticate("post_set_password"), setPassword)
  app.get("/api/accounts/profile", authenticate("profile"), profile)
  app.put("/api/accounts/profile", authenticate("put_profile"), updateProfile)
  app.post("/api/accounts/profile", authenticate("post_profile"), updateProfile)
  app.put("/api/accounts/avatar", authenticate("put_avatar"), updateAvatar)
  app.get("/api/users/:user_id/public-key", authenticate("get_public_keys"), publicKey)
  app.post("/api/accounts/keys", authenticate("post_keys"), keys)
  app.post("/api/accounts/password", authenticate("post_password"), changePassword)
  app.post("/api/accounts/kdf", authenticate("post_kdf"), changeKdf)
  app.post("/api/accounts/key-management/rotate-user-account-keys", authenticate("post_rotatekey"), rotateKeys)
  app.post("/api/accounts/security-stamp", authenticate("post_sstamp"), securityStamp)
  app.post("/api/accounts/email-token", authenticate("post_email_token"), requestEmailToken)
  app.post("/api/accounts/email", authenticate("post_email"), completeEmailChange)
  app.post("/api/accounts/verify-email", authenticate("post_verify_email"), sendEmailVerification)
  app.post("/api/accounts/verify-email-token", verifyEmail)
  app.post("/api/accounts/delete-recover", requestAccountDelete)
  app.post("/api/accounts/delete-recover-token", completeAccountDelete)
  app.post("/api/accounts/delete", authenticate("post_delete_account"), deleteAccount)
  app.delete("/api/accounts", authenticate("delete_account"), deleteAccount)
  app.get("/api/accounts/revision-date", authenticate("revision_date"), revisionDate)
  app.post("/api/accounts/password-hint", passwordHint)
  app.post("/api/accounts/verify-password", authenticate("verify_password"), verifyPassword)
  app.post("/api/accounts/api-key", authenticate("post_api_key"), (context) => updateApiKey(context, false))
  app.post("/api/accounts/rotate-api-key", authenticate("rotate_api_key"), (context) => updateApiKey(context, true))
  app.get("/api/devices/knowndevice", knownDevice)
  app.get("/api/devices", authenticate("get_all_devices"), devices)
  app.get("/api/devices/identifier/:device_id", authenticate("get_device"), device)
}

function identityAccountRequestContextResolve(
  context: Context<AuthenticationEnvironment>,
  options: IdentityRouteOptions,
): Result<{ authentication: AuthenticationContext; database: DatabaseConnection }> {
  const authentication = authenticationContextGet(context)
  if (authentication === undefined)
    return apiErrorCreate("identityAccountAuthentication", "platform.unauthorized", "Authentication is required.")
  const database = options.database ?? context.get("database")
  if (database === undefined)
    return apiErrorCreate("identityAccountDatabase", "platform.internal", "Database unavailable.")
  return { success: true, data: { authentication, database } }
}

async function identityAccountPasswordVerify(
  user: AuthenticationContext["user"],
  password: string,
): Promise<Result<boolean>> {
  return passwordHashVerify(password, user.salt, user.passwordHash, user.passwordIterations)
}

async function identityAccountPasswordOrOtpValidate(
  user: AuthenticationContext["user"],
  data: IdentityAccountPasswordOrOtpData,
  database: DatabaseConnection,
  options: IdentityRouteOptions,
): Promise<Result<void>> {
  return twoFactorPasswordOrOtpValidate(database, user, data, options.clock, options.config, true)
}

function identityAccountPasswordHintNormalize(
  hint: string | null | undefined,
  options: IdentityRouteOptions,
): Result<string | null> {
  const cleanHint = hint === undefined || hint === null ? null : hint.trim() === "" ? null : hint.trim()
  if (cleanHint !== null && !options.config.PASSWORD_HINTS_ALLOWED)
    return identityDomainErrorCreate(
      "identityAccountPasswordHintNormalize",
      "Password hints have been disabled by the administrator. Remove the hint and try again.",
    )
  return { success: true, data: cleanHint }
}

function identityAccountUserSave(
  database: DatabaseConnection,
  user: AuthenticationContext["user"],
  options: IdentityRouteOptions,
): Result<void> {
  user.updatedAt = options.clock.now().toISOString()
  return identityUserSave(database, user)
}

function identityAccountKdfEqual(
  left: { kdf: number; kdfIterations: number; kdfMemory: number | null; kdfParallelism: number | null },
  right: { kdf: number; kdfIterations: number; kdfMemory: number | null; kdfParallelism: number | null },
): boolean {
  return (
    left.kdf === right.kdf &&
    left.kdfIterations === right.kdfIterations &&
    left.kdfMemory === right.kdfMemory &&
    left.kdfParallelism === right.kdfParallelism
  )
}

function identityAccountNotFoundError(op: string, message: string) {
  return resultErrorCreate(op, message, { code: "platform.not-found", statusCode: 404 })
}

function identityAccountKnownDeviceEmailDecode(value: string): Result<string> {
  const normalized = value.replace(/=+$/u, "")
  if (!/^[A-Za-z0-9_-]*$/u.test(normalized) || normalized.length % 4 === 1)
    return identityDomainErrorCreate(
      "identityAccountKnownDevice",
      "X-Request-Email value failed to decode as base64url",
    )
  let bytes: Uint8Array
  try {
    const base64 = normalized.replaceAll("-", "+").replaceAll("_", "/")
    const padding = "=".repeat((4 - (normalized.length % 4)) % 4)
    bytes = Uint8Array.from(atob(base64 + padding), (character) => character.charCodeAt(0))
  } catch {
    return identityDomainErrorCreate(
      "identityAccountKnownDevice",
      "X-Request-Email value failed to decode as base64url",
    )
  }
  try {
    return { success: true, data: new TextDecoder("utf-8", { fatal: true }).decode(bytes) }
  } catch {
    return identityDomainErrorCreate("identityAccountKnownDevice", "X-Request-Email value failed to decode as UTF-8")
  }
}

function identityAccountClientIpResolve(context: Context<AuthenticationEnvironment>): string {
  return context.req.header("x-real-ip") ?? context.req.header("x-forwarded-for")?.split(",", 1)[0]?.trim() ?? "unknown"
}

function identityAccountOrganizationInviteAccept(
  database: DatabaseConnection,
  userUuid: string,
  organizationIdentifier: string | null | undefined,
): Result<void> {
  if (
    organizationIdentifier === undefined ||
    organizationIdentifier === null ||
    organizationIdentifier === "00000000-01DC-01DC-01DC-000000000000" ||
    organizationIdentifier === "00000000-0000-0000-0000-000000000000"
  )
    return resultCreate(undefined)
  try {
    const organization = database
      .query<{ uuid: string }, [string]>("SELECT uuid FROM organizations WHERE uuid = ? LIMIT 1")
      .get(organizationIdentifier)
    if (organization === null)
      return identityDomainErrorCreate("identityAccountSetPassword", "Failed to retrieve the associated organization")
    const membership = database
      .query<OrganizationMembershipRow, [string, string]>(
        `SELECT uuid, user_uuid, org_uuid, invited_by_email, access_all, akey,
                status, atype, reset_password_key, external_id
         FROM users_organizations WHERE user_uuid = ? AND org_uuid = ? LIMIT 1`,
      )
      .get(userUuid, organizationIdentifier)
    if (membership === null)
      return identityDomainErrorCreate("identityAccountSetPassword", "Failed to retrieve the invitation")
    if (membership.status !== 0)
      return identityDomainErrorCreate("identityAccountSetPassword", "User already accepted the invitation")
    const policyResult = organizationPolicyCheckUserAllowed(
      database,
      { ...organizationMembershipFromRow(membership), status: 1 },
      "accept",
    )
    if (!policyResult.success) return policyResult
    database.run(
      "UPDATE users_organizations SET status = 1, reset_password_key = NULL WHERE user_uuid = ? AND org_uuid = ?",
      [userUuid, organizationIdentifier],
    )
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate("identityAccountSetPassword", "Invitation acceptance failed")
  }
}
