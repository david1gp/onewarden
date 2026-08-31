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
    database.run(
      `INSERT INTO extension_session_handoffs (
         token_hash, user_uuid, source_device_uuid, operation, cipher_uuid,
         user_key_iv, user_key_ciphertext, created_at, expires_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tokenHashResult.data,
        userUuid,
        sourceDeviceUuid,
        request.operation,
        request.cipherId,
        request.encryptedUserKey.iv,
        request.encryptedUserKey.ciphertext,
        createdAt.toISOString(),
        expiresAt.toISOString(),
      ],
    )
    return resultCreate({ token, expiresAt: expiresAt.toISOString() })
  } catch {
    return resultErrorCreate(op, "Session handoff could not be created.", {
      code: "platform.internal",
      statusCode: 500,
    })
  }
}
