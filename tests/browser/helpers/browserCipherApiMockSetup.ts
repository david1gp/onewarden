import type { Page } from "@playwright/test"

export interface MockCipherWireData {
  id: string
  type: number
  name: string
  notes?: string | null
  favorite?: boolean
  folderId?: string | null
  organizationId?: string | null
  collectionIds?: string[]
  revisionDate?: string
  creationDate?: string
  deletedDate?: string | null
  archivedDate?: string | null
  login?: Record<string, unknown> | null
  secureNote?: Record<string, unknown> | null
  card?: Record<string, unknown> | null
  identity?: Record<string, unknown> | null
  fields?: Record<string, unknown>[] | null
  attachments?: Record<string, unknown>[] | null
  passwordHistory?: Record<string, unknown>[] | null
}

export function browserMockInitialCiphersGet(): MockCipherWireData[] {
  return [
    {
      id: "cipher-login-1",
      type: 1,
      name: "GitHub Work Account",
      notes: "Work Github account with 2FA enabled",
      favorite: true,
      folderId: "folder-work",
      organizationId: null,
      collectionIds: [],
      revisionDate: "2026-08-20T10:00:00Z",
      creationDate: "2026-01-15T08:00:00Z",
      deletedDate: null,
      archivedDate: null,
      login: {
        username: "alex.rivera@acme.com",
        password: "SuperSecretPassword123!",
        totp: "JBSWY3DPEHPK3PXP",
        uris: [{ uri: "https://github.com/login", match: null }],
        passwordRevisionDate: "2026-08-20T10:00:00Z",
      },
      fields: [
        { name: "Recovery Code", value: "abcd-1234-wxyz", type: 1 },
        { name: "Pin Code", value: "9876", type: 0 },
      ],
      attachments: [
        {
          id: "att-1",
          fileName: "github-recovery-keys.txt",
          size: "1024",
          sizeName: "1.00 KB",
          url: "/api/ciphers/cipher-login-1/attachment/att-1",
          key: "att-key-1",
        },
      ],
      passwordHistory: [
        { password: "OldPassword2025!", lastUsedDate: "2026-01-15T08:00:00Z" },
        { password: "VeryOldPassword2024!", lastUsedDate: "2025-06-10T12:00:00Z" },
      ],
    },
    {
      id: "cipher-note-2",
      type: 2,
      name: "Server SSH Config Notes",
      notes: "Host prod-bastion\n  HostName bastion.acme.internal\n  User admin\n  Port 2222",
      favorite: false,
      folderId: null,
      organizationId: null,
      collectionIds: [],
      revisionDate: "2026-08-25T14:30:00Z",
      creationDate: "2026-03-01T11:00:00Z",
      deletedDate: null,
      archivedDate: null,
      secureNote: { type: 0 },
      fields: [],
      attachments: [],
      passwordHistory: [],
    },
    {
      id: "cipher-card-3",
      type: 3,
      name: "Corporate Visa Platinum",
      notes: "Expensed corporate card for cloud infrastructure",
      favorite: false,
      folderId: null,
      organizationId: null,
      collectionIds: [],
      revisionDate: "2026-08-22T09:15:00Z",
      creationDate: "2026-02-10T10:00:00Z",
      deletedDate: null,
      archivedDate: null,
      card: {
        cardholderName: "Alex Rivera",
        brand: "Visa",
        number: "4000123456789010",
        expMonth: "12",
        expYear: "2029",
        code: "789",
      },
      fields: [{ name: "Billing Zip", value: "94105", type: 0 }],
      attachments: [],
      passwordHistory: [],
    },
    {
      id: "cipher-identity-4",
      type: 4,
      name: "Alex Rivera Personal Profile",
      notes: "Personal identity and tax details",
      favorite: false,
      folderId: null,
      organizationId: null,
      collectionIds: [],
      revisionDate: "2026-08-24T16:00:00Z",
      creationDate: "2026-01-10T12:00:00Z",
      deletedDate: null,
      archivedDate: null,
      identity: {
        title: "Mr.",
        firstName: "Alex",
        middleName: "J.",
        lastName: "Rivera",
        address1: "100 Market Street",
        address2: "Suite 300",
        address3: null,
        city: "San Francisco",
        state: "CA",
        postalCode: "94105",
        country: "United States",
        company: "Acme Corporation",
        email: "alex@example.com",
        phone: "+1 (555) 234-5678",
        ssn: "123-45-6789",
        username: "arivera",
        passportNumber: "USA987654321",
        licenseNumber: "DL-CA-445566",
      },
      fields: [],
      attachments: [],
      passwordHistory: [],
    },
  ]
}

export async function browserCipherApiMockSetup(
  page: Page,
  customCiphers?: MockCipherWireData[],
): Promise<{ getCiphers: () => MockCipherWireData[] }> {
  let ciphers: MockCipherWireData[] = customCiphers ? [...customCiphers] : browserMockInitialCiphersGet()
  let nextCipherId = 1
  let nextAttachmentId = 1
  const mutationDate = "2026-08-29T00:00:00.000Z"

  const responseJson = async (route: Parameters<Parameters<Page["route"]>[1]>[0], body: unknown, status = 200) => {
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) })
  }

  const notFound = (message: string) => ({ message, object: "error" })

  await page.route(/\/api\/ciphers(?:\/.*)?$/, async (route) => {
    const request = route.request()
    const method = request.method()
    const url = new URL(request.url())
    const segments = url.pathname.split("/").filter(Boolean).slice(2).map(decodePathSegment)

    if (segments.length === 0) {
      if (method === "GET") {
        await responseJson(route, { object: "list", data: ciphers, continuationToken: null })
        return
      }

      if (method === "POST") {
        const postData = requestJson(request)
        const source = recordValue(postData.cipher) ?? postData
        const newId = `cipher-mock-${nextCipherId++}`
        const newCipher: MockCipherWireData = {
          id: newId,
          type: numberValue(source.type, 1),
          name: stringValue(source.name, "New Cipher Item"),
          notes: nullableStringValue(source.notes),
          favorite: booleanValue(source.favorite, false),
          folderId: nullableStringValue(source.folderId),
          organizationId: nullableStringValue(source.organizationId),
          collectionIds: stringArrayValue(postData.collectionIds ?? source.collectionIds),
          revisionDate: mutationDate,
          creationDate: mutationDate,
          deletedDate: null,
          archivedDate: null,
          login: recordValue(source.login),
          secureNote: recordValue(source.secureNote),
          card: recordValue(source.card),
          identity: recordValue(source.identity),
          fields: recordArrayValue(source.fields),
          attachments: [],
          passwordHistory: [],
        }
        ciphers = [newCipher, ...ciphers]
        await responseJson(route, newCipher)
        return
      }

      await route.continue()
      return
    }

    const [id, action, attachmentId] = segments
    if (!id) {
      await route.continue()
      return
    }

    const item = ciphers.find((cipher) => cipher.id === id)
    if (action === undefined) {
      if (method === "GET") {
        if (!item) {
          await responseJson(route, notFound("Cipher not found."), 404)
          return
        }
        await responseJson(route, item)
        return
      }

      if (method === "PUT") {
        if (!item) {
          await responseJson(route, notFound("Cipher not found."), 404)
          return
        }
        const putData = requestJson(request)
        const updated: MockCipherWireData = {
          ...item,
          name: stringValue(putData.name, item.name),
          notes: nullableStringValue(putData.notes, item.notes),
          favorite: booleanValue(putData.favorite, item.favorite ?? false),
          folderId: nullableStringValue(putData.folderId, item.folderId ?? null),
          organizationId: nullableStringValue(putData.organizationId, item.organizationId ?? null),
          collectionIds: stringArrayValue(putData.collectionIds, item.collectionIds),
          login: recordValue(putData.login) ?? item.login,
          card: recordValue(putData.card) ?? item.card,
          identity: recordValue(putData.identity) ?? item.identity,
          secureNote: recordValue(putData.secureNote) ?? item.secureNote,
          fields: recordArrayValue(putData.fields, item.fields ?? []),
          revisionDate: mutationDate,
        }
        ciphers = ciphers.map((cipher) => (cipher.id === id ? updated : cipher))
        await responseJson(route, updated)
        return
      }

      if (method === "DELETE") {
        if (!item) {
          await responseJson(route, notFound("Cipher not found."), 404)
          return
        }
        ciphers = ciphers.filter((cipher) => cipher.id !== id)
        await route.fulfill({ status: 200 })
        return
      }

      await route.continue()
      return
    }

    if (action === "partial") {
      if (!item) {
        await responseJson(route, notFound("Cipher not found."), 404)
        return
      }
      const body = requestJson(request)
      if (typeof body.favorite === "boolean") item.favorite = body.favorite
      await responseJson(route, {})
      return
    }

    if (action === "delete" && method === "PUT") {
      if (!item) {
        await responseJson(route, notFound("Cipher not found."), 404)
        return
      }
      item.deletedDate = mutationDate
      await route.fulfill({ status: 200 })
      return
    }

    if (action === "restore" && method === "PUT") {
      if (!item) {
        await responseJson(route, notFound("Cipher not found."), 404)
        return
      }
      item.deletedDate = null
      await responseJson(route, item)
      return
    }

    if ((action === "archive" || action === "unarchive") && method === "PUT") {
      if (!item) {
        await responseJson(route, notFound("Cipher not found."), 404)
        return
      }
      item.archivedDate = action === "archive" ? mutationDate : null
      await responseJson(route, item)
      return
    }

    if (action === "share" && (method === "POST" || method === "PUT")) {
      if (!item) {
        await responseJson(route, notFound("Cipher not found."), 404)
        return
      }
      const body = requestJson(request)
      const sharedCipher = recordValue(body.cipher) ?? recordValue(body.Cipher)
      const organizationId = nullableStringValue(sharedCipher?.organizationId)
      const collectionIds = stringArrayValue(body.collectionIds ?? body.CollectionIds)
      if (!sharedCipher || !organizationId || collectionIds.length === 0) {
        await responseJson(route, notFound("Cipher share payload is invalid."), 400)
        return
      }
      item.organizationId = organizationId
      item.collectionIds = collectionIds
      item.revisionDate = mutationDate
      await responseJson(route, item)
      return
    }

    if ((action === "collections" || action === "collections_v2") && (method === "PUT" || method === "POST")) {
      if (!item) {
        await responseJson(route, notFound("Cipher not found."), 404)
        return
      }
      const body = requestJson(request)
      item.collectionIds = stringArrayValue(body.collectionIds ?? body.CollectionIds)
      item.revisionDate = mutationDate
      await responseJson(route, item)
      return
    }

    if (action === "attachment") {
      if (attachmentId === undefined) {
        if (method !== "POST" || !item) {
          await responseJson(route, notFound("Cipher not found."), item ? 405 : 404)
          return
        }
        const multipart = multipartData(request)
        const newAttachment = {
          id: `att-mock-${nextAttachmentId++}`,
          fileName: multipart.fileName,
          size: "2048",
          sizeName: "2.00 KB",
          url: `/api/ciphers/${encodeURIComponent(id)}/attachment/${encodeURIComponent(`att-mock-${nextAttachmentId - 1}`)}`,
          key: multipart.key,
        }
        item.attachments = [...(item.attachments ?? []), newAttachment]
        item.revisionDate = mutationDate
        await responseJson(route, item)
        return
      }

      if (!item) {
        await responseJson(route, notFound("Cipher not found."), 404)
        return
      }
      const attachment = item.attachments?.find((candidate) => candidate.id === attachmentId)
      if (method === "GET") {
        if (!attachment) {
          await responseJson(route, notFound("Attachment not found."), 404)
          return
        }
        await responseJson(route, attachment)
        return
      }
      if (method === "DELETE" || (method === "POST" && (segments[3] === "delete" || segments[3] === "delete-admin"))) {
        if (!attachment) {
          await responseJson(route, notFound("Attachment not found."), 404)
          return
        }
        item.attachments = (item.attachments ?? []).filter((candidate) => candidate.id !== attachmentId)
        item.revisionDate = mutationDate
        await responseJson(route, { cipher: item })
        return
      }
    }

    await route.continue()
  })

  await page.route(/\/attachments\/[^/]+\/[^/?]+(?:\?.*)?$/, async (route) => {
    const segments = new URL(route.request().url()).pathname.split("/").filter(Boolean).slice(1).map(decodePathSegment)
    const [cipherId, attachmentId] = segments
    const item = ciphers.find((cipher) => cipher.id === cipherId)
    const attachment = item?.attachments?.find((candidate) => candidate.id === attachmentId)
    if (!attachment) {
      await route.fulfill({ status: 404 })
      return
    }
    await route.fulfill({ status: 200, contentType: "application/octet-stream", body: "mock attachment" })
  })

  return {
    getCiphers: () => ciphers,
  }
}

type MockRoute = Parameters<Parameters<Page["route"]>[1]>[0]
type MockRequest = ReturnType<MockRoute["request"]>

function decodePathSegment(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function requestJson(request: MockRequest): Record<string, unknown> {
  try {
    const body = request.postDataJSON()
    return isRecord(body) ? body : {}
  } catch {
    return {}
  }
}

function multipartData(request: MockRequest): { fileName: string; key: string } {
  const body = request.postData() ?? ""
  const fileName = body.match(/name="data";\s*filename="([^"]*)"/i)?.[1] ?? "uploaded-file.txt"
  const key = body.match(/name="key"\r?\n\r?\n([^\r\n]+)/i)?.[1] ?? "attachment-symmetric-key"
  return { fileName, key }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function recordValue(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null
}

function recordArrayValue(value: unknown, fallback: Record<string, unknown>[] = []): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : fallback
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback
}

function nullableStringValue(value: unknown, fallback: string | null = null): string | null {
  return typeof value === "string" || value === null ? value : fallback
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback
}

function numberValue(value: unknown, fallback: number): number {
  return typeof value === "number" ? value : fallback
}

function stringArrayValue(value: unknown, fallback: string[] = []): string[] {
  return Array.isArray(value)
    ? value.filter((candidate): candidate is string => typeof candidate === "string")
    : fallback
}
