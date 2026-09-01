import { expect, test } from "bun:test"
import type { webAuthSessionCreate } from "../../src/web/auth/model/webAuthSessionCreate.js"
import { organizationApiClientCreate } from "../../src/web/organizations/api/organizationApiClientCreate.js"
import { bitwardenOrganizationCsvExportExecute } from "../../src/web/organizations/model/bitwardenOrganizationCsvExportExecute.js"
import { bitwardenOrganizationCsvImportExecute } from "../../src/web/organizations/model/bitwardenOrganizationCsvImportExecute.js"
import { bitwardenOrganizationCsvParse } from "../../src/web/organizations/model/bitwardenOrganizationCsvParse.js"
import type { OrganizationImportRequest } from "../../src/web/organizations/schemas/organizationImportRequestSchema.js"

const csvFixtureUrl = new URL("../fixtures/bitwardenOrganizationCsvTask8.csv", import.meta.url)

function sessionCreate(): ReturnType<typeof webAuthSessionCreate> {
  return {
    session: () => ({
      accessToken: "organization-token",
      email: "test@example.com",
      encryptedUserKey: "encrypted-user-key",
      expiresAt: Date.now() + 60_000,
      kdf: 0,
      kdfIterations: 600_000,
      kdfMemory: null,
      kdfParallelism: null,
      refreshToken: "refresh-token",
      tokenType: "Bearer",
      userId: "user-id",
    }),
  } as ReturnType<typeof webAuthSessionCreate>
}

test("the official organization CSV fixture round-trips through the authenticated organization APIs", async () => {
  const organizationKey = new Uint8Array(64).fill(2)
  const requests: string[] = []
  let imported: OrganizationImportRequest | null = null
  const collectionIds = ["collection-engineering", "collection-shared"]
  const apiClient = organizationApiClientCreate({
    baseUrl: "https://vault.example",
    fetchFn: async (input, init) => {
      const url = String(input)
      requests.push(`${init?.method ?? "GET"} ${url}`)
      if (url.includes("/api/ciphers/import-organization")) {
        imported = JSON.parse(String(init?.body ?? "")) as OrganizationImportRequest
        return new Response(null, { status: 200 })
      }
      if (url.endsWith("/api/organizations/organization-test/export")) {
        if (imported === null) return new Response("Import missing", { status: 500 })
        const importedPayload = imported
        return new Response(
          JSON.stringify({
            ciphers: importedPayload.ciphers.map((cipher, index) => ({
              ...cipher,
              collectionIds: importedPayload.collectionRelationships
                .filter((relationship) => relationship.key === index)
                .map((relationship) => collectionIds[relationship.value]),
              id: `cipher-${index}`,
            })),
            collections: importedPayload.collections.map((collection, index) => ({
              ...collection,
              id: collectionIds[index],
              organizationId: "organization-test",
            })),
          }),
          { headers: { "content-type": "application/json" }, status: 200 },
        )
      }
      return new Response("Not found", { status: 404 })
    },
    token: () => "organization-token",
  })

  const importResult = await bitwardenOrganizationCsvImportExecute({
    apiClient,
    organizationId: "organization-test",
    organizationKey,
    rawContent: await Bun.file(csvFixtureUrl).text(),
    session: sessionCreate(),
  })
  expect(importResult).toMatchObject({ success: true, data: { cipherCount: 2, collectionCount: 2 } })
  expect(requests[0]).toBe(
    "POST https://vault.example/api/ciphers/import-organization?organizationId=organization-test",
  )

  const exportResult = await bitwardenOrganizationCsvExportExecute({
    apiClient,
    organizationId: "organization-test",
    organizationKey,
    session: sessionCreate(),
  })
  expect(exportResult).toMatchObject({ success: true, data: { cipherCount: 2, collectionCount: 2 } })
  expect(requests[1]).toBe("GET https://vault.example/api/organizations/organization-test/export")
  if (!exportResult.success) return
  const parsed = bitwardenOrganizationCsvParse(exportResult.data.content)
  expect(parsed.success).toBe(true)
  if (!parsed.success) return
  expect(parsed.data.map((record) => record.name)).toEqual(['Portal, "Primary"', "Runbook"])
})
