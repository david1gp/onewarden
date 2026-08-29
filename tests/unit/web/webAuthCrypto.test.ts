import { expect, test } from "bun:test"
import { webAuthMasterKeyDerive } from "../../../src/web/auth/model/webAuthMasterKeyDerive.js"
import { webAuthMasterPasswordHashDerive } from "../../../src/web/auth/model/webAuthMasterPasswordHashDerive.js"
import { webAuthUserKeyUnlock } from "../../../src/web/auth/model/webAuthUserKeyUnlock.js"
import { webAuthUserKeysGenerate } from "../../../src/web/auth/model/webAuthUserKeysGenerate.js"

test("webAuth crypto derives master key and master password hash deterministically", async () => {
  const kdfMetadata = { kdfType: 0, iterations: 100_000, memory: null, parallelism: null }
  const masterKeyResult = await webAuthMasterKeyDerive("secret123", "user@example.com", kdfMetadata)
  expect(masterKeyResult.success).toBe(true)
  if (!masterKeyResult.success) return

  expect(masterKeyResult.data.byteLength).toBe(32)

  const hashResult = await webAuthMasterPasswordHashDerive("secret123", masterKeyResult.data)
  expect(hashResult.success).toBe(true)
  if (!hashResult.success) return

  expect(typeof hashResult.data).toBe("string")
  expect(hashResult.data.length).toBeGreaterThan(0)
})

test("webAuthUserKeysGenerate generates valid keys and webAuthUserKeyUnlock decrypts them", async () => {
  const kdfMetadata = { kdfType: 0, iterations: 100_000, memory: null, parallelism: null }
  const generated = await webAuthUserKeysGenerate("myStrongPassword!", "alice@example.com", kdfMetadata)
  expect(generated.success).toBe(true)
  if (!generated.success) return

  expect(generated.data.userKey.byteLength).toBe(64)
  expect(typeof generated.data.wrappedUserKey).toBe("string")
  expect(typeof generated.data.encryptedPrivateKey).toBe("string")
  expect(typeof generated.data.publicKey).toBe("string")

  const unlocked = await webAuthUserKeyUnlock(
    "myStrongPassword!",
    "alice@example.com",
    kdfMetadata,
    generated.data.wrappedUserKey,
  )
  expect(unlocked.success).toBe(true)
  if (!unlocked.success) return

  expect(unlocked.data).toEqual(generated.data.userKey)

  const invalidUnlock = await webAuthUserKeyUnlock(
    "wrongPassword!",
    "alice@example.com",
    kdfMetadata,
    generated.data.wrappedUserKey,
  )
  expect(invalidUnlock.success).toBe(false)
})
