import { type Result } from "#result"
import { resultCreate } from "../../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"

export function sendRecipientsNormalize(input: string | null | undefined): Result<string | null> {
  const value = input?.trim() ?? ""
  if (value === "") return resultCreate(null)

  const recipients: string[] = []
  const seen = new Set<string>()
  for (const candidate of value.split(",")) {
    const email = candidate.trim().toLowerCase()
    if (email === "") continue
    if (!sendRecipientEmailIsValid(email))
      return resultErrorCreate("sendRecipientsNormalize", "Send recipient email is invalid.", {
        code: "platform.invalid-request",
        statusCode: 400,
      })
    if (seen.has(email)) continue
    seen.add(email)
    recipients.push(email)
  }

  return resultCreate(recipients.length === 0 ? null : recipients.join(","))
}

function sendRecipientEmailIsValid(email: string): boolean {
  if (email.length > 320 || /[\s]/u.test(email)) return false
  const separator = email.lastIndexOf("@")
  if (separator < 1 || separator !== email.indexOf("@") || separator === email.length - 1) return false
  const domain = email.slice(separator + 1)
  try {
    const domainUrl = new URL(`https://${domain}`)
    return domainUrl.pathname === "/" && domainUrl.search === "" && domainUrl.hostname.length > 0
  } catch {
    return false
  }
}
