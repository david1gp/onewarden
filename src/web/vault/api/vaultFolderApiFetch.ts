import type { Result } from "#result"
import * as v from "valibot"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { type VaultFolder, vaultFolderSchema } from "../model/vaultFolderSchema.js"

export interface VaultFolderApiOptions {
  baseUrl?: string
  token?: string
  fetch?: (input: string | URL | Request, init?: RequestInit) => Promise<Response>
}

const vaultFolderListResponseSchema = v.object({
  data: v.array(vaultFolderSchema),
  object: v.optional(v.literal("list")),
})

export async function vaultFolderApiFetch(
  options: VaultFolderApiOptions = {},
): Promise<Result<readonly VaultFolder[]>> {
  const op = "vaultFolderApiFetch"
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
    response = await fetchFn(`${baseUrl}/api/folders`, {
      method: "GET",
      headers,
    })
  } catch (error) {
    return resultErrorCreate(op, `Network request failed: ${error instanceof Error ? error.message : String(error)}`)
  }

  if (!response.ok) {
    return resultErrorCreate(op, `Folder request failed with status ${response.status}: ${response.statusText}`, {
      statusCode: response.status,
    })
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    return resultErrorCreate(op, "Failed to parse folder list JSON response")
  }

  const parsed = v.safeParse(vaultFolderListResponseSchema, body)
  if (!parsed.success) {
    return resultErrorCreate(op, "Invalid folder list response schema")
  }

  return resultCreate(parsed.output.data)
}
