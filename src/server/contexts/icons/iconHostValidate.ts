import { isIP } from "node:net"
import { domainToASCII } from "node:url"
import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"

export function iconHostValidate(value: string): Result<string> {
  const op = "iconHostValidate"
  if (value.length === 0 || value !== value.trim() || /[/?#\\%\s]/u.test(value))
    return resultErrorCreate(op, "The icon host is invalid.")

  const unbracketed = value.startsWith("[") && value.endsWith("]") ? value.slice(1, -1) : value
  const ipVersion = isIP(unbracketed)
  if (ipVersion === 4) return resultCreate(unbracketed)
  if (ipVersion === 6) return resultCreate(unbracketed.toLowerCase())
  if (value.includes(":")) return resultErrorCreate(op, "The icon host is invalid.")

  const host = domainToASCII(value.toLowerCase())
  if (host.length === 0 || host.length > 253 || host.endsWith("."))
    return resultErrorCreate(op, "The icon host is invalid.")
  if (
    !host
      .split(".")
      .every(
        (label) =>
          label.length > 0 &&
          label.length <= 63 &&
          !label.startsWith("-") &&
          !label.endsWith("-") &&
          [...label].every((character) => /[a-z0-9-]/u.test(character)),
      )
  )
    return resultErrorCreate(op, "The icon host is invalid.")
  return resultCreate(host)
}
