import { expect, test } from "bun:test"
import { attachmentDownloadTokenCreate } from "../../src/server/contexts/attachments/attachmentDownloadTokenCreate.js"
import { attachmentDownloadTokenVerify } from "../../src/server/contexts/attachments/attachmentDownloadTokenVerify.js"
import { serverAppCreate } from "../../src/server/serverAppCreate.js"
import { serverRouteRegistrationIntrospect } from "../../src/server/serverRouteRegistrationIntrospect.js"
import { clockTestCreate } from "../../src/shared/clock/clockTestCreate.js"
import { rsaKeyPairGenerate } from "../../src/shared/crypto/rsaKeyPairGenerate.js"
import manifest from "../../tools/compatibility/upstream-route-manifest.json"

const expectedRoutes = [
  ["GET", "/api/ciphers/:cipher_id/attachments"],
  ["GET", "/api/ciphers/:cipher_id/attachment/:attachment_id/data"],
  ["GET", "/api/ciphers/:cipher_id/attachment/:attachment_id"],
  ["POST", "/api/ciphers/:cipher_id/attachment/v2"],
  ["POST", "/api/ciphers/:cipher_id/attachment/:attachment_id"],
  ["POST", "/api/ciphers/:cipher_id/attachment"],
  ["POST", "/api/ciphers/:cipher_id/attachment-admin"],
  ["POST", "/api/ciphers/:cipher_id/attachment/:attachment_id/share"],
  ["POST", "/api/ciphers/:cipher_id/attachment/:attachment_id/delete-admin"],
  ["POST", "/api/ciphers/:cipher_id/attachment/:attachment_id/delete"],
  ["DELETE", "/api/ciphers/:cipher_id/attachment/:attachment_id"],
  ["DELETE", "/api/ciphers/:cipher_id/attachment/:attachment_id/admin"],
  ["GET", "/attachments/:cipher_id/:file_id"],
]

test("task 16 registers the upstream attachment routes and legacy aliases", () => {
  const actual = serverRouteRegistrationIntrospect(serverAppCreate())
    .filter((route) => route.path.includes("attachment"))
    .map(({ method, path }) => [method, path])
  const expected = expectedRoutes.toSorted(([leftMethod, leftPath], [rightMethod, rightPath]) =>
    `${leftMethod} ${leftPath}`.localeCompare(`${rightMethod} ${rightPath}`),
  )
  expect(actual).toEqual(
    expected.flatMap((route) => (route[1]?.startsWith("/api/") === true ? [route, route] : [route])),
  )
  expect(manifest.aliases).toContainEqual({
    canonicalRouteId: "core.1134.post_attachment_v2",
    kind: "legacy",
    routeIds: ["core.1134.post_attachment_v2", "core.1377.post_attachment", "core.1394.post_attachment_admin"],
  })
  expect(manifest.aliases).toContainEqual({
    kind: "method-compatibility",
    routeIds: ["core.1094.get_attachment", "core.1356.post_attachment_v2_data", "core.1440.delete_attachment"],
  })
})

test("attachment download tokens bind the cipher and file and expire after five minutes", async () => {
  const keyPairResult = rsaKeyPairGenerate()
  if (!keyPairResult.success) throw new Error(keyPairResult.errorMessage)
  const clock = clockTestCreate("2026-08-28T00:00:00.000Z")
  const tokenResult = await attachmentDownloadTokenCreate(
    "cipher-one",
    "attachment-one",
    keyPairResult.data.privateKey,
    "https://vault.example",
    clock,
  )
  if (!tokenResult.success) throw new Error(tokenResult.errorMessage)
  expect(
    await attachmentDownloadTokenVerify(
      tokenResult.data,
      "cipher-one",
      "attachment-one",
      keyPairResult.data.publicKey,
      "https://vault.example",
      clock,
    ),
  ).toEqual({ success: true, data: true })
  expect(
    await attachmentDownloadTokenVerify(
      tokenResult.data,
      "other-cipher",
      "attachment-one",
      keyPairResult.data.publicKey,
      "https://vault.example",
      clock,
    ),
  ).toEqual({ success: true, data: false })
  expect(
    await attachmentDownloadTokenVerify(
      tokenResult.data,
      "cipher-one",
      "attachment-one",
      keyPairResult.data.publicKey,
      "https://vault.example",
      clockTestCreate("2026-08-28T00:05:31.000Z"),
    ),
  ).toEqual({ success: true, data: false })
})
