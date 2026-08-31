import { type KeyInput } from "jose"
import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { sha256Hex } from "../../../shared/crypto/sha256Hex.js"
import type { Identifier } from "../../../shared/identifier/identifier.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { SessionHandoffConsumeRequest } from "../../../shared/sessionHandoff/sessionHandoffConsumeRequestSchema.js"
import type { SessionHandoffConsumeResponse } from "../../../shared/sessionHandoff/sessionHandoffConsumeResponseSchema.js"
import type { DatabaseConnection } from "../../database/database.js"
import { databaseTransaction } from "../../database/databaseTransaction.js"
import { identityDeviceCreate } from "../identity/identityDeviceCreate.js"
import { identityDeviceSave } from "../identity/identityDeviceSave.js"
import type { IdentityConfig } from "../identity/identityConfigSchema.js"
import { identityTokenBundleCreate } from "../identity/identityTokenBundleCreate.js"
import { identityUserFindByUuid } from "../identity/identityUserFindByUuid.js"

type SessionHandoffRow = {
  cipher_uuid: string | null
  operation: "create" | "edit"
  source_device_uuid: string
  user_key_ciphertext: string
  user_key_iv: string
  user_uuid: string
}

type SessionHandoffConsumeOptions = {
  clock: Clock
  config: IdentityConfig
  database: DatabaseConnection
  identifier: Identifier
  issuer: string
  privateKey: KeyInput | undefined
}

function authenticationErrorCreate() {
  return resultErrorCreate("sessionHandoffConsume", "Session handoff is invalid or expired.", {
    code: "platform.unauthorized",
    statusCode: 401,
  })
}

export async function sessionHandoffConsume(
  token: string,
  request: SessionHandoffConsumeRequest,
  options: SessionHandoffConsumeOptions,
): Promise<Result<SessionHandoffConsumeResponse>> {
  const op = "sessionHandoffConsume"
  if (!/^[A-Za-z0-9_-]{43}$/u.test(token)) return authenticationErrorCreate()
  const tokenHashResult = await sha256Hex(token)
  if (!tokenHashResult.success) return tokenHashResult
  let row: SessionHandoffRow | null
  try {
    row = options.database
      .query<SessionHandoffRow, [string, string, string, string | null, string | null, string]>(
        `SELECT user_uuid, source_device_uuid, operation, cipher_uuid,
                user_key_iv, user_key_ciphertext
         FROM extension_session_handoffs
         WHERE token_hash = ?
           AND expires_at > ?
           AND operation = ?
           AND ((cipher_uuid IS NULL AND ? IS NULL) OR cipher_uuid = ?)
           AND source_device_uuid <> ?
         LIMIT 1`,
      )
      .get(
        tokenHashResult.data,
        options.clock.now().toISOString(),
        request.operation,
        request.cipherId,
        request.cipherId,
        request.deviceIdentifier,
      )
  } catch {
    return resultErrorCreate(op, "Session handoff lookup failed.", {
      code: "platform.internal",
      statusCode: 500,
    })
  }
  if (row === null) return authenticationErrorCreate()
  const userResult = identityUserFindByUuid(options.database, row.user_uuid)
  if (!userResult.success) return userResult
  if (userResult.data === null || !userResult.data.enabled || userResult.data.akey === "") {
    return authenticationErrorCreate()
  }
  const deviceResult = identityDeviceCreate(
    request.deviceIdentifier,
    userResult.data.uuid,
    "OneWarden Web",
    6,
    options.clock,
    options.identifier,
  )
  if (!deviceResult.success) return deviceResult
  const bundleResult = await identityTokenBundleCreate(
    userResult.data,
    deviceResult.data,
    "web",
    options.issuer,
    options.privateKey,
    options.clock,
    options.config,
  )
  if (!bundleResult.success) return bundleResult
  const consumeResult = databaseTransaction(options.database, () => {
    try {
      const deleted = options.database
        .query<{ token_hash: string }, [string, string, string, string | null, string | null, string]>(
          `DELETE FROM extension_session_handoffs
           WHERE token_hash = ?
             AND expires_at > ?
             AND operation = ?
             AND ((cipher_uuid IS NULL AND ? IS NULL) OR cipher_uuid = ?)
             AND source_device_uuid <> ?
           RETURNING token_hash`,
        )
        .get(
          tokenHashResult.data,
          options.clock.now().toISOString(),
          request.operation,
          request.cipherId,
          request.cipherId,
          request.deviceIdentifier,
        )
      if (deleted === null) return authenticationErrorCreate()
      return identityDeviceSave(options.database, deviceResult.data, options.clock, false)
    } catch {
      return resultErrorCreate(op, "Session handoff consumption failed.", {
        code: "platform.internal",
        statusCode: 500,
      })
    }
  })
  if (!consumeResult.success) return consumeResult
  const response = {
    accessToken: bundleResult.data.accessToken,
    refreshToken: bundleResult.data.refreshToken,
    expiresIn: bundleResult.data.expiresIn,
    email: userResult.data.email,
    userId: userResult.data.uuid,
    kdf: userResult.data.clientKdfType,
    kdfIterations: userResult.data.clientKdfIter,
    kdfMemory: userResult.data.clientKdfMemory,
    kdfParallelism: userResult.data.clientKdfParallelism,
    encryptedUserKey: userResult.data.akey,
    userKeyTransfer: {
      algorithm: "AES-GCM" as const,
      iv: row.user_key_iv,
      ciphertext: row.user_key_ciphertext,
    },
    operation: row.operation,
    cipherId: row.cipher_uuid,
  }
  return resultCreate(response as SessionHandoffConsumeResponse)
}
