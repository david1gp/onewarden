import type { Result } from "#result"
import * as v from "valibot"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { type VaultSyncResponse, vaultSyncResponseSchema } from "../model/vaultSyncResponseSchema.js"

export interface VaultSyncApiOptions {
  baseUrl?: string
  token?: string
  fetch?: (input: string | URL | Request, init?: RequestInit) => Promise<Response>
}

export async function vaultSyncApiFetch(options: VaultSyncApiOptions = {}): Promise<Result<VaultSyncResponse>> {
  const op = "vaultSyncApiFetch"
  const fetchFn = options.fetch ?? fetch
  const baseUrl = options.baseUrl ?? ""
  const headers: Record<string, string> = {
    Accept: "application/json",
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`
  }

  let response: Response
  try {
    response = await fetchFn(`${baseUrl}/api/sync`, {
      method: "GET",
      headers,
    })
  } catch (error) {
    return resultErrorCreate(op, `Network request failed: ${error instanceof Error ? error.message : String(error)}`)
  }

  if (!response.ok) {
    return resultErrorCreate(op, `Sync request failed with status ${response.status}: ${response.statusText}`, {
      statusCode: response.status,
    })
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    return resultErrorCreate(op, "Failed to parse sync JSON response")
  }

  const parsed = v.safeParse(vaultSyncResponseSchema, body)
  if (!parsed.success) {
    return resultErrorCreate(op, "Invalid sync response payload schema")
  }

  return resultCreate(parsed.output)
}
