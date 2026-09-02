import { expect, test } from "bun:test"
import { clockTestCreate } from "../../../../src/shared/clock/clockTestCreate.js"
import { jwtSign } from "../../../../src/shared/crypto/jwtSign.js"
import { jwtVerify } from "../../../../src/shared/crypto/jwtVerify.js"
import { rsaKeyPairGenerate } from "../../../../src/shared/crypto/rsaKeyPairGenerate.js"
import { rsaPrivateKeyLoad } from "../../../../src/shared/crypto/rsaPrivateKeyLoad.js"
import { rsaPublicKeyDerive } from "../../../../src/shared/crypto/rsaPublicKeyDerive.js"
import { rsaPublicKeyLoad } from "../../../../src/shared/crypto/rsaPublicKeyLoad.js"
import fixtures from "../../../fixtures/cryptoFixtures.json"

const rsaPrivateKeyBegin = "-----BEGIN " + "RSA PRIVATE KEY-----"

test("RSA generation returns target-compatible PEM boundaries", () => {
  const result = rsaKeyPairGenerate()

  expect(result.success).toBe(true)
  if (!result.success) return
  expect(result.data.privateKeyPem).toStartWith(rsaPrivateKeyBegin)
  expect(result.data.publicKeyPem).toStartWith("-----BEGIN PUBLIC KEY-----")
  expect(result.data.privateKey.type).toBe("private")
  expect(result.data.publicKey.type).toBe("public")

  const loadedPrivate = rsaPrivateKeyLoad(result.data.privateKeyPem)
  const loadedPublic = rsaPublicKeyLoad(result.data.publicKeyPem)
  expect(loadedPrivate.success).toBe(true)
  expect(loadedPublic.success).toBe(true)
})

test("RSA key loading derives a public verification boundary", () => {
  const generated = rsaKeyPairGenerate()
  expect(generated.success).toBe(true)
  if (!generated.success) return
  const privateKey = rsaPrivateKeyLoad(generated.data.privateKeyPem)
  expect(privateKey.success).toBe(true)
  if (!privateKey.success) return

  const publicKey = rsaPublicKeyDerive(privateKey.data)
  expect(publicKey.success).toBe(true)
  if (!publicKey.success) return
  expect(publicKey.data.type).toBe("public")
})

test("JOSE JWT adapters sign RS256 and verify with an injected clock", async () => {
  const generated = rsaKeyPairGenerate()
  expect(generated.success).toBe(true)
  if (!generated.success) return
  const publicKey = rsaPublicKeyDerive(generated.data.privateKey)
  expect(publicKey.success).toBe(true)
  if (!publicKey.success) return

  const signed = await jwtSign(fixtures.jwt.claims, generated.data.privateKey)
  expect(signed.success).toBe(true)
  if (!signed.success) return

  const parts = signed.data.split(".")
  expect(parts).toHaveLength(3)
  expect(parts[0]).toBe("eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9")

  const verified = await jwtVerify(signed.data, publicKey.data, fixtures.jwt.issuer, clockTestCreate(1_700_000_100_000))
  expect(verified).toEqual({ success: true, data: fixtures.jwt.claims })

  const whitespaceToken = `${signed.data.slice(0, 12)}\n${signed.data.slice(12)}`
  const whitespaceVerified = await jwtVerify(
    whitespaceToken,
    publicKey.data,
    fixtures.jwt.issuer,
    clockTestCreate(1_700_000_100_000),
  )
  expect(whitespaceVerified.success).toBe(true)
})

test("JWT verification enforces issuer and 30-second clock tolerance", async () => {
  const publicKey = rsaPublicKeyLoad(fixtures.jwt.publicKeyPem)
  expect(publicKey.success).toBe(true)
  if (!publicKey.success) return

  const wrongIssuer = await jwtVerify(
    fixtures.jwt.token,
    publicKey.data,
    "https://wrong.example|login",
    clockTestCreate(1_700_000_100_000),
  )
  const expired = await jwtVerify(
    fixtures.jwt.token,
    publicKey.data,
    fixtures.jwt.issuer,
    clockTestCreate(1_700_003_631_000),
  )
  const notYetValid = await jwtVerify(
    fixtures.jwt.token,
    publicKey.data,
    fixtures.jwt.issuer,
    clockTestCreate(1_699_999_969_000),
  )

  expect(wrongIssuer.success).toBe(false)
  expect(expired.success).toBe(false)
  expect(notYetValid.success).toBe(false)
})
