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
import { extensionSessionHandoffs } from "../../database/schema/extensionSessionHandoffs.js"
import { identityDeviceCreate } from "../identity/identityDeviceCreate.js"
import { identityDeviceSave } from "../identity/identityDeviceSave.js"
import type { IdentityConfig } from "../identity/identityConfigSchema.js"
import { identityTokenBundleCreate } from "../identity/identityTokenBundleCreate.js"
import { identityUserFindByUuid } from "../identity/identityUserFindByUuid.js"
import { and, eq, gt, ne, isNull } from "drizzle-orm"

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
  let row: typeof extensionSessionHandoffs.$inferSelect | null
  try {
    const cipherCondition =
      request.cipherId === null
        ? isNull(extensionSessionHandoffs.cipherUuid)
        : eq(extensionSessionHandoffs.cipherUuid, request.cipherId)
    row =
      options.database.drizzle
        .select()
        .from(extensionSessionHandoffs)
        .where(
          and(
            eq(extensionSessionHandoffs.tokenHash, tokenHashResult.data),
            gt(extensionSessionHandoffs.expiresAt, options.clock.now().toISOString()),
            eq(extensionSessionHandoffs.operation, request.operation),
            cipherCondition,
            ne(extensionSessionHandoffs.sourceDeviceUuid, request.deviceIdentifier),
          ),
        )
        .limit(1)
        .get() ?? null
  } catch {
    return resultErrorCreate(op, "Session handoff lookup failed.", {
      code: "platform.internal",
      statusCode: 500,
    })
  }
  if (row === null) return authenticationErrorCreate()
  const userResult = identityUserFindByUuid(options.database, row.userUuid)
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
      const deleted = options.database.drizzle
        .delete(extensionSessionHandoffs)
        .where(
          and(
            eq(extensionSessionHandoffs.tokenHash, tokenHashResult.data),
            gt(extensionSessionHandoffs.expiresAt, options.clock.now().toISOString()),
            eq(extensionSessionHandoffs.operation, request.operation),
            request.cipherId === null
              ? isNull(extensionSessionHandoffs.cipherUuid)
              : eq(extensionSessionHandoffs.cipherUuid, request.cipherId),
            ne(extensionSessionHandoffs.sourceDeviceUuid, request.deviceIdentifier),
          ),
        )
        .returning({ tokenHash: extensionSessionHandoffs.tokenHash })
        .get()
      if (deleted === undefined) return authenticationErrorCreate()
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
      iv: row.userKeyIv,
      ciphertext: row.userKeyCiphertext,
    },
    operation: row.operation,
    cipherId: row.cipherUuid,
  }
  return resultCreate(response as SessionHandoffConsumeResponse)
}
