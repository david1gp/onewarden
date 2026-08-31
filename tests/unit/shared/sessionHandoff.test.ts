import { expect, test } from "bun:test"
import { sessionHandoffFragmentCreate } from "../../../src/shared/sessionHandoff/sessionHandoffFragmentCreate.js"
import { sessionHandoffFragmentParse } from "../../../src/shared/sessionHandoff/sessionHandoffFragmentParse.js"
import { sessionHandoffUserKeyDecrypt } from "../../../src/shared/sessionHandoff/sessionHandoffUserKeyDecrypt.js"
import { sessionHandoffUserKeyEncrypt } from "../../../src/shared/sessionHandoff/sessionHandoffUserKeyEncrypt.js"

const token = "A".repeat(43)

test("session handoff fragment carries only an opaque token and local transfer key", async () => {
  const userKey = new Uint8Array(64).fill(7)
  const encryptedResult = await sessionHandoffUserKeyEncrypt(userKey, "edit", "cipher/one")
  expect(encryptedResult.success).toBe(true)
  if (!encryptedResult.success) return

  const urlResult = sessionHandoffFragmentCreate(
    "https://vault.example",
    token,
    encryptedResult.data.transferKey,
    "edit",
    "cipher/one",
  )
  expect(urlResult.success).toBe(true)
  if (!urlResult.success) return
  const url = new URL(urlResult.data)
  expect(`${url.origin}${url.pathname}`).toBe("https://vault.example/ciphers/cipher%2Fone/edit")
  expect(url.search).toBe("")
  expect(urlResult.data).not.toContain("access_token")
  expect(urlResult.data).not.toContain("refresh_token")

  const fragmentResult = sessionHandoffFragmentParse(url.hash)
  expect(fragmentResult).toMatchObject({
    success: true,
    data: { operation: "edit", cipherId: "cipher/one", token, version: 1 },
  })
  if (!fragmentResult.success || fragmentResult.data === null) return
  expect(fragmentResult.data.transferKey).not.toBe(token)
})

test("session handoff locally encrypts the user key and binds operation and cipher", async () => {
  const userKey = new Uint8Array(64).map((_, index) => index)
  const encryptedResult = await sessionHandoffUserKeyEncrypt(userKey, "edit", "cipher-one")
  expect(encryptedResult.success).toBe(true)
  if (!encryptedResult.success) return
  expect(encryptedResult.data.encryptedUserKey.ciphertext).not.toContain(String(userKey))

  const decryptedResult = await sessionHandoffUserKeyDecrypt(
    encryptedResult.data.encryptedUserKey,
    encryptedResult.data.transferKey,
    "edit",
    "cipher-one",
  )
  expect(decryptedResult.success).toBe(true)
  if (decryptedResult.success) expect(decryptedResult.data).toEqual(userKey)

  const wrongCipherResult = await sessionHandoffUserKeyDecrypt(
    encryptedResult.data.encryptedUserKey,
    encryptedResult.data.transferKey,
    "edit",
    "cipher-two",
  )
  expect(wrongCipherResult.success).toBe(false)
  encryptedResult.data.transferKey.fill(0)
})

test("session handoff fragment parser rejects malformed transfer data", () => {
  expect(sessionHandoffFragmentParse("")).toEqual({ success: true, data: null })
  expect(sessionHandoffFragmentParse("#onewarden-handoff=not-json").success).toBe(false)
})

test("create handoff keeps the active-site prefill in the fragment until consumption", () => {
  const result = sessionHandoffFragmentCreate(
    "https://onewarden.example",
    token,
    new Uint8Array(32).fill(3),
    "create",
    null,
    "https://current.example/sign-in?next=%2Faccount",
  )

  expect(result.success).toBe(true)
  if (!result.success) return
  const url = new URL(result.data)
  expect(url.search).toBe("")
  expect(sessionHandoffFragmentParse(url.hash)).toMatchObject({
    success: true,
    data: { prefillUrl: "https://current.example/sign-in?next=%2Faccount" },
  })
})
