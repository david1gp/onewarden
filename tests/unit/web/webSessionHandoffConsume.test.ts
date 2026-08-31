import { expect, test } from "bun:test"
import { base64UrlEncode } from "../../../src/shared/crypto/base64UrlEncode.js"
import { resultCreate } from "../../../src/shared/result/resultCreate.js"
import { sessionHandoffUserKeyEncrypt } from "../../../src/shared/sessionHandoff/sessionHandoffUserKeyEncrypt.js"
import { webSessionHandoffConsume } from "../../../src/web/sessionHandoffs/model/webSessionHandoffConsume.js"

test("web session handoff consumes into an unlocked edit session and target route", async () => {
  const userKey = new Uint8Array(64).fill(11)
  const encryptedResult = await sessionHandoffUserKeyEncrypt(userKey, "edit", "cipher-one")
  expect(encryptedResult.success).toBe(true)
  if (!encryptedResult.success) return
  const acceptedKey: number[] = []
  let consumedRequest: unknown
  const result = await webSessionHandoffConsume({
    apiClient: {
      consume: (_token, request) => {
        consumedRequest = request
        return Promise.resolve(
          resultCreate({
            accessToken: "access-token",
            refreshToken: "refresh-token",
            expiresIn: 7_200,
            email: "user@example.com",
            userId: "user-one",
            kdf: 0,
            kdfIterations: 600_000,
            kdfMemory: null,
            kdfParallelism: null,
            encryptedUserKey: "wrapped-key",
            userKeyTransfer: encryptedResult.data.encryptedUserKey,
            operation: "edit" as const,
            cipherId: "cipher-one",
          }),
        )
      },
    },
    deviceIdentifier: "web-device",
    fragment: {
      version: 1,
      token: "A".repeat(43),
      transferKey: base64UrlEncode(encryptedResult.data.transferKey),
      operation: "edit",
      cipherId: "cipher-one",
    },
    session: {
      sessionHandoffAccept: (_response, key) => {
        acceptedKey.push(...key)
        return resultCreate({} as never)
      },
    },
  })

  expect(result).toEqual({ success: true, data: "/ciphers/cipher-one/edit" })
  expect(consumedRequest).toEqual({ operation: "edit", cipherId: "cipher-one", deviceIdentifier: "web-device" })
  expect(acceptedKey).toEqual(Array.from(userKey))
})
