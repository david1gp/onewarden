import * as v from "valibot"
import { type Result } from "#result"
import { base64UrlDecode } from "../crypto/base64UrlDecode.js"
import { resultCreate } from "../result/resultCreate.js"
import { resultErrorCreate } from "../result/resultErrorCreate.js"
import { type SessionHandoffFragment, sessionHandoffFragmentSchema } from "./sessionHandoffFragmentSchema.js"

export function sessionHandoffFragmentParse(hash: string): Result<SessionHandoffFragment | null> {
  const op = "sessionHandoffFragmentParse"
  const value = new URLSearchParams(hash.replace(/^#/u, "")).get("onewarden-handoff")
  if (value === null) return resultCreate(null)
  const decodedResult = base64UrlDecode(value)
  if (!decodedResult.success) return resultErrorCreate(op, "Session handoff fragment is invalid.")
  let input: unknown
  try {
    input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(decodedResult.data))
  } catch {
    return resultErrorCreate(op, "Session handoff fragment is invalid.")
  }
  const parsed = v.safeParse(sessionHandoffFragmentSchema, input)
  if (!parsed.success) return resultErrorCreate(op, "Session handoff fragment is invalid.")
  return resultCreate(parsed.output)
}
