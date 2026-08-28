import type { KeyInput } from "jose"
import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { constantTimeStringsEqual } from "../../../shared/crypto/constantTimeStringsEqual.js"
import { jwtSign } from "../../../shared/crypto/jwtSign.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import type { DatabaseConnection } from "../../database/database.js"
import type { IdentityApiKeyTokenResponse } from "./identityApiKeyTokenResponseSchema.js"
import type { IdentityConfig } from "./identityConfigSchema.js"
import { identityDeviceResolve } from "./identityDeviceResolve.js"
import { identityDeviceSave } from "./identityDeviceSave.js"
import { identityDomainErrorCreate } from "./identityDomainErrorCreate.js"
import { identityAccessTokenClaimsCreate } from "./identityAccessTokenClaimsCreate.js"
import type { IdentityTokenRequest } from "./identityTokenRequestSchema.js"
import { identityUserFindByUuid } from "./identityUserFindByUuid.js"
import type { IdentityUser } from "./identityUser.js"

type IdentityPersonalApiKeyLoginOptions = {
  clock: Clock
  config: IdentityConfig
  database: DatabaseConnection | undefined
  identifier: Identifier
  issuer: string
  privateKey: KeyInput | undefined
  clientIp: string
}

function identityPersonalApiKeyTokenResponseCreate(
  user: IdentityUser,
  accessToken: string,
  expiresIn: number,
): IdentityApiKeyTokenResponse {
  const hasMasterPassword = user.passwordHash.byteLength > 0
  const masterPasswordUnlock = hasMasterPassword
    ? {
        Kdf: {
          KdfType: user.clientKdfType,
          Iterations: user.clientKdfIter,
          Memory: user.clientKdfMemory,
          Parallelism: user.clientKdfParallelism,
        },
        MasterKeyEncryptedUserKey: user.akey,
        MasterKeyWrappedUserKey: user.akey,
        Salt: user.email,
      }
    : null
  const accountKeys =
    user.privateKey === null
      ? null
      : {
          publicKeyEncryptionKeyPair: {
            wrappedPrivateKey: user.privateKey,
            publicKey: user.publicKey,
            Object: "publicKeyEncryptionKeyPair" as const,
          },
          Object: "privateKeys" as const,
        }
  const response: IdentityApiKeyTokenResponse = {
    access_token: accessToken,
    expires_in: expiresIn,
    token_type: "Bearer",
    PrivateKey: user.privateKey,
    Kdf: user.clientKdfType,
    KdfIterations: user.clientKdfIter,
    KdfMemory: user.clientKdfMemory,
    KdfParallelism: user.clientKdfParallelism,
    ResetMasterPassword: false,
    ForcePasswordReset: false,
    scope: "api",
    AccountKeys: accountKeys,
    UserDecryptionOptions: {
      HasMasterPassword: hasMasterPassword,
      MasterPasswordUnlock: masterPasswordUnlock,
      Object: "userDecryptionOptions",
    },
  }
  if (user.akey !== "") response.Key = user.akey
  return response
}

export async function identityPersonalApiKeyLogin(
  data: IdentityTokenRequest,
  options: IdentityPersonalApiKeyLoginOptions,
): Promise<Result<IdentityApiKeyTokenResponse>> {
  const op = "identityPersonalApiKeyLogin"
  const database = options.database
  if (database === undefined) {
    return resultErrorCreate(op, "Identity database is unavailable.", { code: "platform.unavailable", statusCode: 503 })
  }
  const clientId = data.clientId
  if (clientId === undefined) return identityDomainErrorCreate(op, "client_id cannot be blank")
  const clientSecret = data.clientSecret
  if (clientSecret === undefined) return identityDomainErrorCreate(op, "client_secret cannot be blank")
  if (!clientId.startsWith("user.")) return identityDomainErrorCreate(op, "Malformed client_id")

  const userResult = identityUserFindByUuid(database, clientId.slice("user.".length))
  if (!userResult.success) return userResult
  if (userResult.data === null) return identityDomainErrorCreate(op, "Invalid client_id")
  const user = userResult.data
  if (!user.enabled) return identityDomainErrorCreate(op, "This user has been disabled (API key login)")
  if (user.apiKey === null || !constantTimeStringsEqual(user.apiKey, clientSecret))
    return identityDomainErrorCreate(op, "Incorrect client_secret")

  const deviceResult = identityDeviceResolve(database, data, user.uuid, options.clock, options.identifier)
  if (!deviceResult.success) return deviceResult
  const device = deviceResult.data
  if (options.privateKey === undefined) return resultErrorCreate(op, "Identity token signing is unavailable.")
  const now = Math.floor(options.clock.now().getTime() / 1_000)
  const accessClaims = identityAccessTokenClaimsCreate(
    device,
    user,
    now,
    now + 2 * 60 * 60,
    clientId,
    options.issuer,
    options.config,
    ["api"],
  )
  const accessTokenResult = await jwtSign(accessClaims, options.privateKey)
  if (!accessTokenResult.success) return resultErrorCreate(op, "Identity access token signing failed.")
  const saveResult = identityDeviceSave(database, device, options.clock, true)
  if (!saveResult.success) return saveResult
  return resultCreate(identityPersonalApiKeyTokenResponseCreate(user, accessTokenResult.data, accessClaims.exp - now))
}
