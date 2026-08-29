import type { Result } from "#result"
import * as v from "valibot"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { type VaultCollection, vaultCollectionSchema } from "../model/vaultCollectionSchema.js"

export interface VaultCollectionApiOptions {
  baseUrl?: string
  token?: string
  fetch?: (input: string | URL | Request, init?: RequestInit) => Promise<Response>
}

const vaultCollectionListResponseSchema = v.object({
  data: v.array(vaultCollectionSchema),
  object: v.optional(v.literal("list")),
})

export async function vaultCollectionApiFetch(
  options: VaultCollectionApiOptions = {},
): Promise<Result<readonly VaultCollection[]>> {
  const op = "vaultCollectionApiFetch"
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
    response = await fetchFn(`${baseUrl}/api/collections`, {
      method: "GET",
      headers,
    })
  } catch (error) {
    return resultErrorCreate(op, `Network request failed: ${error instanceof Error ? error.message : String(error)}`)
  }

  if (!response.ok) {
    return resultErrorCreate(op, `Collection request failed with status ${response.status}: ${response.statusText}`, {
      statusCode: response.status,
    })
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    return resultErrorCreate(op, "Failed to parse collection list JSON response")
  }

  const parsed = v.safeParse(vaultCollectionListResponseSchema, body)
  if (!parsed.success) {
    return resultErrorCreate(op, "Invalid collection list response schema")
  }

  return resultCreate(parsed.output.data)
}
