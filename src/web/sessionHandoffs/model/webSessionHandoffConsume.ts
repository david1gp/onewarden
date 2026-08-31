import { type Result } from "#result"
import { base64UrlDecode } from "../../../shared/crypto/base64UrlDecode.js"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { SessionHandoffFragment } from "../../../shared/sessionHandoff/sessionHandoffFragmentSchema.js"
import { sessionHandoffRouteCreate } from "../../../shared/sessionHandoff/sessionHandoffRouteCreate.js"
import { sessionHandoffUserKeyDecrypt } from "../../../shared/sessionHandoff/sessionHandoffUserKeyDecrypt.js"
import type { webAuthSessionCreate } from "../../auth/model/webAuthSessionCreate.js"
import type { webSessionHandoffApiClientCreate } from "./webSessionHandoffApiClientCreate.js"

type WebSessionHandoffConsumeOptions = {
  apiClient: Pick<ReturnType<typeof webSessionHandoffApiClientCreate>, "consume">
  deviceIdentifier: string
  fragment: SessionHandoffFragment
  session: Pick<ReturnType<typeof webAuthSessionCreate>, "sessionHandoffAccept">
}

export async function webSessionHandoffConsume(options: WebSessionHandoffConsumeOptions): Promise<Result<string>> {
  const op = "webSessionHandoffConsume"
  const request =
    options.fragment.operation === "create"
      ? { operation: "create" as const, cipherId: null, deviceIdentifier: options.deviceIdentifier }
      : {
          operation: "edit" as const,
          cipherId: options.fragment.cipherId,
          deviceIdentifier: options.deviceIdentifier,
        }
  const responseResult = await options.apiClient.consume(options.fragment.token, request)
  if (!responseResult.success) return responseResult
  const response = responseResult.data
  if (response.operation !== options.fragment.operation || response.cipherId !== options.fragment.cipherId) {
    return resultErrorCreate(op, "Session handoff binding did not match.", {
      code: "platform.unauthorized",
      statusCode: 401,
    })
  }
  const transferKeyResult = base64UrlDecode(options.fragment.transferKey)
  if (!transferKeyResult.success) return transferKeyResult
  const transferKey = transferKeyResult.data
  const userKeyResult = await sessionHandoffUserKeyDecrypt(
    response.userKeyTransfer,
    transferKey,
    response.operation,
    response.cipherId,
  )
  transferKey.fill(0)
  if (!userKeyResult.success) return userKeyResult
  const acceptResult = options.session.sessionHandoffAccept(response, userKeyResult.data)
  if (!acceptResult.success) {
    userKeyResult.data.fill(0)
    return acceptResult
  }
  return resultCreate(sessionHandoffRouteCreate(response.operation, response.cipherId))
}
