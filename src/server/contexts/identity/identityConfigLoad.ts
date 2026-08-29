import { type Result } from "#result"
import * as v from "valibot"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import { base64Decode } from "../../../shared/crypto/base64Decode.js"
import { identityConfigSchema, type IdentityConfig } from "./identityConfigSchema.js"

export function identityConfigLoad(
  source: Readonly<Record<string, string | undefined>> = Bun.env,
): Result<IdentityConfig> {
  const op = "identityConfigLoad"
  const result = v.safeParse(identityConfigSchema, source)
  if (!result.success) return resultErrorCreate(op, v.summarize(result.issues))
  if (
    result.output.DUO_ENABLED &&
    [result.output.DUO_HOST, result.output.DUO_IKEY, result.output.DUO_SKEY].some((value) => value !== "") &&
    [result.output.DUO_HOST, result.output.DUO_IKEY, result.output.DUO_SKEY].some((value) => value === "")
  )
    return resultErrorCreate(op, "All Duo options need to be set for global Duo support.")
  if ((result.output.YUBICO_CLIENT_ID === "") !== (result.output.YUBICO_SECRET_KEY === ""))
    return resultErrorCreate(op, "Both YUBICO_CLIENT_ID and YUBICO_SECRET_KEY must be set for Yubikey support.")
  if (result.output.YUBICO_SECRET_KEY !== "" && !base64Decode(result.output.YUBICO_SECRET_KEY).success)
    return resultErrorCreate(op, "YUBICO_SECRET_KEY must be valid Base64.")
  if (result.output.YUBICO_SERVER !== "") {
    const serverResult = v.safeParse(v.pipe(v.string(), v.url()), result.output.YUBICO_SERVER)
    if (!serverResult.success || new URL(result.output.YUBICO_SERVER).protocol !== "https:")
      return resultErrorCreate(op, "YUBICO_SERVER must be a valid HTTPS URL.")
  }
  return resultCreate(result.output)
}
