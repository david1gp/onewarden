import { expect, test } from "bun:test"
import { bitwardenCipherStringEncrypt } from "../../../src/shared/crypto/bitwardenCipherStringEncrypt.js"
import type { webAuthSessionCreate } from "../../../src/web/auth/model/webAuthSessionCreate.js"
import { bitwardenCsvFieldsParse } from "../../../src/web/settings/model/bitwardenCsvFieldsParse.js"
import { bitwardenCsvFormat } from "../../../src/web/settings/model/bitwardenCsvFormat.js"
import { bitwardenCsvParse } from "../../../src/web/settings/model/bitwardenCsvParse.js"
import { vaultExportExecute } from "../../../src/web/settings/model/vaultExportExecute.js"
import { vaultImportExecute } from "../../../src/web/settings/model/vaultImportExecute.js"
import { webSettingsApiClientCreate } from "../../../src/web/settings/model/webSettingsApiClientCreate.js"

const fixtureUrl = new URL("../../fixtures/bitwardenCsvTask3.csv", import.meta.url)

function testSession(): ReturnType<typeof webAuthSessionCreate> {
  return {
    session: () => ({
      email: "user@example.test",
      accessToken: "test-token",
      refreshToken: "test-refresh-token",
      tokenType: "Bearer",
      expiresAt: Date.now() + 60_000,
      userId: "user-id",
      kdf: 0,
      kdfIterations: 1_000,
      kdfMemory: null,
      kdfParallelism: null,
      encryptedUserKey: "wrapped-user-key",
    }),
    getUserKey: () => new Uint8Array(64),
  } as ReturnType<typeof webAuthSessionCreate>
}

async function encrypted(value: string | null): Promise<string | null> {
  if (value === null) return null
  const result = await bitwardenCipherStringEncrypt(value, new Uint8Array(64))
  expect(result.success).toBe(true)
  return result.success ? result.data : null
}

test("Bitwarden CSV fixture preserves quoting, CRLF, mappings, and lossy fields", async () => {
  const fixture = await Bun.file(fixtureUrl).text()
  const parsed = bitwardenCsvParse(fixture.replaceAll("\n", "\r\n"))

  expect(parsed.success).toBe(true)
  if (!parsed.success) return
  expect(parsed.data).toHaveLength(2)
  expect(parsed.data[0]).toMatchObject({
    folder: "Personal",
    favorite: true,
    type: "login",
    name: 'Portal, "Primary"',
    notes: "First line\r\nSecond line",
    reprompt: 1,
    login_uri: "https://example.test",
    login_username: "user@example.test",
    login_password: "password",
    login_totp: "JBSWY3DPEHPK3PXP",
  })
  const fields = bitwardenCsvFieldsParse(typeof parsed.data[0]?.fields === "string" ? parsed.data[0].fields : null)
  expect(fields.success).toBe(true)
  if (!fields.success) return
  expect(fields.data).toEqual([
    { name: "Environment", value: "test", type: 0, linkedId: null },
    { name: "Recovery code", value: "abc:def", type: 0, linkedId: null },
  ])
  expect(parsed.data[1]).toMatchObject({ type: "note", favorite: false, reprompt: 0 })
})

test("Bitwarden CSV formatter emits documented fields and round-trips quoted values", () => {
  const csv = bitwardenCsvFormat([
    {
      folder: "Personal",
      favorite: true,
      type: "login",
      name: 'Portal, "Primary"',
      notes: "First line\nSecond line",
      fields: [
        { name: "Environment", value: "test" },
        { name: "Recovery code", value: "abc:def" },
      ],
      reprompt: 1,
      login_uri: "https://example.test",
      login_username: "user@example.test",
      login_password: "password",
      login_totp: "JBSWY3DPEHPK3PXP",
    },
  ])

  expect(csv).toContain("\r\n")
  expect(csv).toContain('"Portal, ""Primary"""')
  expect(csv).toContain('"Environment: test\nRecovery code: abc:def"')
  const parsed = bitwardenCsvParse(csv)
  expect(parsed.success).toBe(true)
  if (parsed.success) expect(parsed.data[0]?.fields).toBe("Environment: test\nRecovery code: abc:def")
})

test("Bitwarden CSV parser rejects unsupported types, invalid values, and malformed records", () => {
  const header = "folder,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp"
  const validRow = "Personal,0,login,Portal,,,,0,,,,"
  const invalidInputs = [
    `folder,type,${header.slice("folder,type,".length)}\n${validRow}`,
    `${header}\nPersonal,true,login,Portal,,,,0,,,,`,
    `${header}\nPersonal,0,card,Card,,,,0,,,,`,
    `${header}\nPersonal,0,securenote,Note,,,,0,,,,`,
    `${header}\nPersonal,0,login,"Unterminated,,,,0,,,,`,
    `${header}\nPersonal,0,login,Portal with "quote,,,,0,,,,`,
    `${header}\nPersonal,0,login,Portal,,,,0,,,`,
  ]

  for (const input of invalidInputs) expect(bitwardenCsvParse(input).success).toBe(false)
  expect(bitwardenCsvParse("").success).toBe(false)
})

test("Bitwarden CSV import stores fields and secure-note/login properties", async () => {
  const imported = { value: null as { ciphers: Array<Record<string, unknown>> } | null }
  const apiClient = webSettingsApiClientCreate({
    fetch: async (input, init) => {
      if (!String(input).endsWith("/api/ciphers/import")) return new Response("Not found", { status: 404 })
      imported.value = JSON.parse(String(init?.body ?? "")) as { ciphers: Array<Record<string, unknown>> }
      return new Response(JSON.stringify({ revisionDate: "2026-08-31T12:00:00.000Z" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    },
  })
  const fixture = await Bun.file(fixtureUrl).text()
  const result = await vaultImportExecute({ session: testSession(), rawContent: fixture, format: "csv", apiClient })

  expect(result.success).toBe(true)
  expect(imported.value?.ciphers).toHaveLength(2)
  expect(imported.value?.ciphers[0]).toMatchObject({ type: 1, favorite: true, reprompt: 1 })
  expect(imported.value?.ciphers[0]?.login).toMatchObject({
    uris: [{ match: null }],
  })
  expect(imported.value?.ciphers[0]?.fields).toEqual([
    { name: expect.any(String), value: expect.any(String), type: 0, linkedId: null },
    { name: expect.any(String), value: expect.any(String), type: 0, linkedId: null },
  ])
  expect(imported.value?.ciphers[1]).toMatchObject({ type: 2, favorite: false, reprompt: 0, login: null })
})

test("Bitwarden CSV export includes supported records and lossy first-URI fields only", async () => {
  const encryptedLogin = {
    id: "login-id",
    organizationId: null,
    folderId: null,
    type: 1,
    name: await encrypted("Login"),
    notes: await encrypted("Notes"),
    favorite: true,
    reprompt: 1,
    login: {
      username: await encrypted("username"),
      password: await encrypted("password"),
      uris: [{ uri: await encrypted("https://first.test"), match: 0 }, { uri: await encrypted("https://second.test") }],
      totp: await encrypted("totp"),
    },
    fields: [{ name: await encrypted("Environment"), value: await encrypted("test"), type: 0, linkedId: null }],
  }
  const encryptedNote = {
    id: "note-id",
    organizationId: null,
    folderId: null,
    type: 2,
    name: await encrypted("Note"),
    notes: await encrypted("Secure note"),
    favorite: false,
    reprompt: 0,
    secureNote: { type: 0 },
    fields: [],
  }
  const encryptedCard = {
    id: "card-id",
    organizationId: null,
    folderId: null,
    type: 3,
    name: await encrypted("Card"),
    card: { brand: await encrypted("Visa") },
  }
  const apiClient = webSettingsApiClientCreate({
    fetch: async (input) =>
      String(input).endsWith("/api/sync")
        ? new Response(JSON.stringify({ folders: [], ciphers: [encryptedLogin, encryptedNote, encryptedCard] }), {
            status: 200,
            headers: { "content-type": "application/json" },
          })
        : new Response("Not found", { status: 404 }),
  })

  const result = await vaultExportExecute({ session: testSession(), format: "csv-decrypted", apiClient })
  expect(result.success).toBe(true)
  if (!result.success) return
  const parsed = bitwardenCsvParse(result.data.content)
  expect(parsed.success).toBe(true)
  if (!parsed.success) return
  expect(parsed.data.map((record) => record.type)).toEqual(["login", "note"])
  expect(parsed.data[0]).toMatchObject({
    favorite: true,
    reprompt: 1,
    login_uri: "https://first.test",
    login_username: "username",
    login_password: "password",
    login_totp: "totp",
    fields: "Environment: test",
  })
})
