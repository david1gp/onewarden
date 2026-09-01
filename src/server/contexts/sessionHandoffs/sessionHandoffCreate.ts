import { type Result } from "#result"
import type { Clock } from "../../../shared/clock/clock.js"
import { base64UrlEncode } from "../../../shared/crypto/base64UrlEncode.js"
import { secureRandomBytes } from "../../../shared/crypto/secureRandomBytes.js"
import { sha256Hex } from "../../../shared/crypto/sha256Hex.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { SessionHandoffCreateRequest } from "../../../shared/sessionHandoff/sessionHandoffCreateRequestSchema.js"
import type { SessionHandoffCreateResponse } from "../../../shared/sessionHandoff/sessionHandoffCreateResponseSchema.js"
import type { DatabaseConnection } from "../../database/database.js"
import {
  extensionSessionHandoffs,
  type ExtensionSessionHandoffInsert,
} from "../../database/schema/extensionSessionHandoffs.js"

const sessionHandoffLifetimeMilliseconds = 45_000

export async function sessionHandoffCreate(
  database: DatabaseConnection,
  userUuid: string,
  sourceDeviceUuid: string,
  request: SessionHandoffCreateRequest,
  clock: Clock,
): Promise<Result<SessionHandoffCreateResponse>> {
  const op = "sessionHandoffCreate"
  const tokenResult = secureRandomBytes(32)
  if (!tokenResult.success) return tokenResult
  const token = base64UrlEncode(tokenResult.data)
  const tokenHashResult = await sha256Hex(token)
  if (!tokenHashResult.success) return tokenHashResult
  const createdAt = clock.now()
  const expiresAt = new Date(createdAt.getTime() + sessionHandoffLifetimeMilliseconds)
  try {
    const values: ExtensionSessionHandoffInsert = {
      tokenHash: tokenHashResult.data,
      userUuid,
      sourceDeviceUuid,
      operation: request.operation,
      cipherUuid: request.cipherId,
      userKeyIv: request.encryptedUserKey.iv,
      userKeyCiphertext: request.encryptedUserKey.ciphertext,
      createdAt: createdAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    }
    database.drizzle.insert(extensionSessionHandoffs).values(values).run()
    return resultCreate({ token, expiresAt: expiresAt.toISOString() })
  } catch {
    return resultErrorCreate(op, "Session handoff could not be created.", {
      code: "platform.internal",
      statusCode: 500,
    })
  }
}
