import type { ExtensionAutofillPolicy } from "../storage/extensionAutofillPolicySchema.js"
import type { ExtensionAutofillCandidate } from "./extensionAutofillCandidateSchema.js"
import type { ExtensionAutofillFieldDescriptor } from "./extensionAutofillFieldDescriptorSchema.js"

/** Selects only an unambiguous login for a complete login form under an explicit enabled policy. */
export function extensionAutofillPageLoadCandidateSelect(
  policy: ExtensionAutofillPolicy,
  url: string,
  fields: readonly ExtensionAutofillFieldDescriptor[],
  candidates: readonly ExtensionAutofillCandidate[],
): ExtensionAutofillCandidate | null {
  if (!policy.pageLoadEnabled) return null
  let hostname: string
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null
    hostname = parsed.hostname.toLowerCase().replace(/^www\./, "")
  } catch {
    return null
  }
  if (policy.disabledSites.some((site) => site.toLowerCase().replace(/^www\./, "") === hostname)) return null
  if (!fields.some((field) => field.kind === "username") || !fields.some((field) => field.kind === "currentPassword"))
    return null
  if (fields.some((field) => field.kind.startsWith("card") || field.kind.startsWith("identity"))) return null
  const allowed = candidates.filter((candidate) => candidate.type === 1 && candidate.permission !== "restricted")
  return allowed.length === 1 ? (allowed[0] ?? null) : null
}
