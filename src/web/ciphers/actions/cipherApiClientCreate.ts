import { type Result, resultTryParsingFetchErr } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { cipherItemFromWire } from "../model/cipherItemFromWire.js"
import { cipherItemToWire } from "../model/cipherItemToWire.js"
import type { CipherFormData } from "../schemas/cipherFormDataSchema.js"
import type { CipherItem } from "../schemas/cipherItemSchema.js"

export interface CipherApiClientOptions {
  baseUrl?: string
  fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
  accessToken?: () => string | null
}

export function cipherApiClientCreate(options: CipherApiClientOptions = {}) {
  const fetchImpl = options.fetch ?? globalThis.fetch
  const baseUrl = options.baseUrl ?? ""

  const getHeaders = (): HeadersInit => {
    const headers: Record<string, string> = {
      accept: "application/json",
      "content-type": "application/json",
    }
    const token = options.accessToken?.()
    if (token) {
      headers.authorization = `Bearer ${token}`
    }
    return headers
  }

  return {
    async list(): Promise<Result<CipherItem[]>> {
      const op = "cipherApiClient.list"
      try {
        const res = await fetchImpl(`${baseUrl}/api/ciphers`, {
          method: "GET",
          headers: getHeaders(),
        })
        if (!res.ok) {
          const text = await res.text()
          return resultTryParsingFetchErr(op, text, res.status, res.statusText)
        }
        const body = (await res.json()) as { data?: Record<string, unknown>[] }
        const items = (body.data ?? []).map(cipherItemFromWire)
        return resultCreate(items)
      } catch (err: any) {
        return resultErrorCreate(op, err?.message ?? "Failed to fetch ciphers.")
      }
    },

    async get(id: string): Promise<Result<CipherItem>> {
      const op = "cipherApiClient.get"
      try {
        const res = await fetchImpl(`${baseUrl}/api/ciphers/${encodeURIComponent(id)}`, {
          method: "GET",
          headers: getHeaders(),
        })
        if (!res.ok) {
          const text = await res.text()
          return resultTryParsingFetchErr(op, text, res.status, res.statusText)
        }
        const body = (await res.json()) as Record<string, unknown>
        return resultCreate(cipherItemFromWire(body))
      } catch (err: any) {
        return resultErrorCreate(op, err?.message ?? "Failed to fetch cipher details.")
      }
    },

    async create(data: CipherFormData | CipherItem): Promise<Result<CipherItem>> {
      const op = "cipherApiClient.create"
      try {
        const wirePayload = cipherItemToWire(data)
        const res = await fetchImpl(`${baseUrl}/api/ciphers`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify(wirePayload),
        })
        if (!res.ok) {
          const text = await res.text()
          return resultTryParsingFetchErr(op, text, res.status, res.statusText)
        }
        const body = (await res.json()) as Record<string, unknown>
        return resultCreate(cipherItemFromWire(body))
      } catch (err: any) {
        return resultErrorCreate(op, err?.message ?? "Failed to create cipher.")
      }
    },

    async update(id: string, data: CipherFormData | CipherItem): Promise<Result<CipherItem>> {
      const op = "cipherApiClient.update"
      try {
        const wirePayload = cipherItemToWire(data)
        const res = await fetchImpl(`${baseUrl}/api/ciphers/${encodeURIComponent(id)}`, {
          method: "PUT",
          headers: getHeaders(),
          body: JSON.stringify(wirePayload),
        })
        if (!res.ok) {
          const text = await res.text()
          return resultTryParsingFetchErr(op, text, res.status, res.statusText)
        }
        const body = (await res.json()) as Record<string, unknown>
        return resultCreate(cipherItemFromWire(body))
      } catch (err: any) {
        return resultErrorCreate(op, err?.message ?? "Failed to update cipher.")
      }
    },

    async favorite(id: string, favorite: boolean): Promise<Result<void>> {
      const op = "cipherApiClient.favorite"
      try {
        const res = await fetchImpl(`${baseUrl}/api/ciphers/${encodeURIComponent(id)}/partial`, {
          method: "PUT",
          headers: getHeaders(),
          body: JSON.stringify({ favorite }),
        })
        if (!res.ok) {
          const text = await res.text()
          return resultTryParsingFetchErr(op, text, res.status, res.statusText)
        }
        return resultCreate(undefined)
      } catch (err: any) {
        return resultErrorCreate(op, err?.message ?? "Failed to set favorite.")
      }
    },

    async softDelete(id: string): Promise<Result<void>> {
      const op = "cipherApiClient.softDelete"
      try {
        const res = await fetchImpl(`${baseUrl}/api/ciphers/${encodeURIComponent(id)}/delete`, {
          method: "PUT",
          headers: getHeaders(),
        })
        if (!res.ok) {
          const text = await res.text()
          return resultTryParsingFetchErr(op, text, res.status, res.statusText)
        }
        return resultCreate(undefined)
      } catch (err: any) {
        return resultErrorCreate(op, err?.message ?? "Failed to move cipher to trash.")
      }
    },

    async hardDelete(id: string): Promise<Result<void>> {
      const op = "cipherApiClient.hardDelete"
      try {
        const res = await fetchImpl(`${baseUrl}/api/ciphers/${encodeURIComponent(id)}`, {
          method: "DELETE",
          headers: getHeaders(),
        })
        if (!res.ok) {
          const text = await res.text()
          return resultTryParsingFetchErr(op, text, res.status, res.statusText)
        }
        return resultCreate(undefined)
      } catch (err: any) {
        return resultErrorCreate(op, err?.message ?? "Failed to delete cipher permanently.")
      }
    },

    async restore(id: string): Promise<Result<CipherItem>> {
      const op = "cipherApiClient.restore"
      try {
        const res = await fetchImpl(`${baseUrl}/api/ciphers/${encodeURIComponent(id)}/restore`, {
          method: "PUT",
          headers: getHeaders(),
        })
        if (!res.ok) {
          const text = await res.text()
          return resultTryParsingFetchErr(op, text, res.status, res.statusText)
        }
        const body = (await res.json()) as Record<string, unknown>
        return resultCreate(cipherItemFromWire(body))
      } catch (err: any) {
        return resultErrorCreate(op, err?.message ?? "Failed to restore cipher.")
      }
    },

    async archive(id: string, archived: boolean): Promise<Result<CipherItem>> {
      const op = "cipherApiClient.archive"
      try {
        const endpoint = archived ? "archive" : "unarchive"
        const res = await fetchImpl(`${baseUrl}/api/ciphers/${encodeURIComponent(id)}/${endpoint}`, {
          method: "PUT",
          headers: getHeaders(),
        })
        if (!res.ok) {
          const text = await res.text()
          return resultTryParsingFetchErr(op, text, res.status, res.statusText)
        }
        const body = (await res.json()) as Record<string, unknown>
        return resultCreate(cipherItemFromWire(body))
      } catch (err: any) {
        return resultErrorCreate(op, err?.message ?? `Failed to ${archived ? "archive" : "unarchive"} cipher.`)
      }
    },

    async move(ids: string[], folderId: string | null): Promise<Result<void>> {
      const op = "cipherApiClient.move"
      try {
        const res = await fetchImpl(`${baseUrl}/api/ciphers/move`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({ ids, folderId }),
        })
        if (!res.ok) {
          const text = await res.text()
          return resultTryParsingFetchErr(op, text, res.status, res.statusText)
        }
        return resultCreate(undefined)
      } catch (err: any) {
        return resultErrorCreate(op, err?.message ?? "Failed to move cipher.")
      }
    },

    async share(
      id: string,
      _organizationId: string,
      collectionIds: string[],
      cipherData: CipherFormData | CipherItem,
    ): Promise<Result<CipherItem>> {
      const op = "cipherApiClient.share"
      try {
        const wireCipher = cipherItemToWire(cipherData)
        const res = await fetchImpl(`${baseUrl}/api/ciphers/${encodeURIComponent(id)}/share`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            cipher: wireCipher,
            collectionIds,
          }),
        })
        if (!res.ok) {
          const text = await res.text()
          return resultTryParsingFetchErr(op, text, res.status, res.statusText)
        }
        const body = (await res.json()) as Record<string, unknown>
        return resultCreate(cipherItemFromWire(body))
      } catch (err: any) {
        return resultErrorCreate(op, err?.message ?? "Failed to share cipher to organization.")
      }
    },

    async updateCollections(id: string, collectionIds: string[]): Promise<Result<CipherItem>> {
      const op = "cipherApiClient.updateCollections"
      try {
        const res = await fetchImpl(`${baseUrl}/api/ciphers/${encodeURIComponent(id)}/collections`, {
          method: "PUT",
          headers: getHeaders(),
          body: JSON.stringify({ collectionIds }),
        })
        if (!res.ok) {
          const text = await res.text()
          return resultTryParsingFetchErr(op, text, res.status, res.statusText)
        }
        const body = (await res.json()) as Record<string, unknown>
        return resultCreate(cipherItemFromWire(body))
      } catch (err: any) {
        return resultErrorCreate(op, err?.message ?? "Failed to update collections.")
      }
    },

    async uploadAttachment(
      cipherId: string,
      file: Blob | File,
      fileName: string,
      key?: string,
    ): Promise<Result<CipherItem>> {
      const op = "cipherApiClient.uploadAttachment"
      try {
        const formData = new FormData()
        formData.append("data", file, fileName)
        formData.append("key", key ?? "attachment-symmetric-key")

        const headers: Record<string, string> = {
          accept: "application/json",
        }
        const token = options.accessToken?.()
        if (token) {
          headers.authorization = `Bearer ${token}`
        }

        const res = await fetchImpl(`${baseUrl}/api/ciphers/${encodeURIComponent(cipherId)}/attachment`, {
          method: "POST",
          headers,
          body: formData,
        })
        if (!res.ok) {
          const text = await res.text()
          return resultTryParsingFetchErr(op, text, res.status, res.statusText)
        }
        const body = (await res.json()) as Record<string, unknown>
        return resultCreate(cipherItemFromWire(body))
      } catch (err: any) {
        return resultErrorCreate(op, err?.message ?? "Failed to upload attachment.")
      }
    },

    async deleteAttachment(cipherId: string, attachmentId: string): Promise<Result<void>> {
      const op = "cipherApiClient.deleteAttachment"
      try {
        const res = await fetchImpl(
          `${baseUrl}/api/ciphers/${encodeURIComponent(cipherId)}/attachment/${encodeURIComponent(attachmentId)}`,
          {
            method: "DELETE",
            headers: getHeaders(),
          },
        )
        if (!res.ok) {
          const text = await res.text()
          return resultTryParsingFetchErr(op, text, res.status, res.statusText)
        }
        return resultCreate(undefined)
      } catch (err: any) {
        return resultErrorCreate(op, err?.message ?? "Failed to delete attachment.")
      }
    },

    async clone(id: string): Promise<Result<CipherItem>> {
      const op = "cipherApiClient.clone"
      try {
        const getRes = await fetchImpl(`${baseUrl}/api/ciphers/${encodeURIComponent(id)}`, {
          method: "GET",
          headers: getHeaders(),
        })
        if (!getRes.ok) {
          const text = await getRes.text()
          return resultTryParsingFetchErr(op, text, getRes.status, getRes.statusText)
        }
        const existing = (await getRes.json()) as Record<string, unknown>
        const item = cipherItemFromWire(existing)

        const clonedData: CipherFormData = {
          type: item.type,
          name: `${item.name} (Clone)`,
          notes: item.notes ?? undefined,
          favorite: false,
          folderId: item.folderId ?? null,
          username: item.login?.username ?? undefined,
          password: item.login?.password ?? undefined,
          totp: item.login?.totp ?? undefined,
          uri: item.login?.uris?.[0]?.uri ?? undefined,
          cardholderName: item.card?.cardholderName ?? undefined,
          brand: item.card?.brand ?? undefined,
          number: item.card?.number ?? undefined,
          expMonth: item.card?.expMonth ?? undefined,
          expYear: item.card?.expYear ?? undefined,
          code: item.card?.code ?? undefined,
          title: item.identity?.title ?? undefined,
          firstName: item.identity?.firstName ?? undefined,
          middleName: item.identity?.middleName ?? undefined,
          lastName: item.identity?.lastName ?? undefined,
          company: item.identity?.company ?? undefined,
          email: item.identity?.email ?? undefined,
          phone: item.identity?.phone ?? undefined,
          address1: item.identity?.address1 ?? undefined,
          address2: item.identity?.address2 ?? undefined,
          city: item.identity?.city ?? undefined,
          state: item.identity?.state ?? undefined,
          postalCode: item.identity?.postalCode ?? undefined,
          country: item.identity?.country ?? undefined,
          ssn: item.identity?.ssn ?? undefined,
          passportNumber: item.identity?.passportNumber ?? undefined,
          licenseNumber: item.identity?.licenseNumber ?? undefined,
          fields: [...item.fields],
        }

        const wirePayload = cipherItemToWire(clonedData)
        const createRes = await fetchImpl(`${baseUrl}/api/ciphers`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify(wirePayload),
        })
        if (!createRes.ok) {
          const text = await createRes.text()
          return resultTryParsingFetchErr(op, text, createRes.status, createRes.statusText)
        }
        const createdBody = (await createRes.json()) as Record<string, unknown>
        return resultCreate(cipherItemFromWire(createdBody))
      } catch (err: any) {
        return resultErrorCreate(op, err?.message ?? "Failed to clone cipher.")
      }
    },
  }
}
