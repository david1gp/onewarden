import { extensionPersonalLoginSiteMatch } from "../background/extensionPersonalLoginSiteMatch.js"
import type { ExtensionCipher } from "../crypto/extensionCipherSchema.js"
import type { ExtensionAutofillCandidate } from "./extensionAutofillCandidateSchema.js"
import type { ExtensionAutofillFieldKind } from "./extensionAutofillFieldKindSchema.js"

/** Creates secret-free candidates that match the focused field family and frame URL. */
export function extensionAutofillCandidatesCreate(
  ciphers: readonly ExtensionCipher[],
  url: string,
  fieldKind: ExtensionAutofillFieldKind,
): ExtensionAutofillCandidate[] {
  const type = extensionAutofillCipherTypeResolve(fieldKind)
  if (type === null) return []

  return ciphers
    .filter((cipher) => cipher.type === type && cipher.deletedDate === null && (cipher.archivedDate ?? null) === null)
    .filter((cipher) => cipher.type !== 1 || extensionPersonalLoginSiteMatch(cipher, url))
    .filter(
      (cipher) =>
        fieldKind !== "totp" ||
        (cipher.type === 1 &&
          cipher.viewPassword !== false &&
          cipher.login.totp !== null &&
          cipher.login.totp.trim() !== ""),
    )
    .map((cipher): ExtensionAutofillCandidate => {
      const permission: ExtensionAutofillCandidate["permission"] =
        cipher.permissions?.read === false ? "restricted" : cipher.edit === false ? "readOnly" : "allowed"
      return {
        id: cipher.id,
        type,
        name: cipher.name,
        subtitle: extensionAutofillCandidateSubtitleCreate(cipher),
        permission,
      }
    })
    .sort((left, right) => left.name.localeCompare(right.name))
}

function extensionAutofillCipherTypeResolve(kind: ExtensionAutofillFieldKind): 1 | 3 | 4 | null {
  if (kind === "username" || kind === "currentPassword" || kind === "totp") return 1
  if (kind.startsWith("card")) return 3
  if (kind.startsWith("identity")) return 4
  return null
}

function extensionAutofillCandidateSubtitleCreate(cipher: ExtensionCipher): string | null {
  if (cipher.type === 1) return cipher.login.username
  if (cipher.type === 3) {
    const ending = cipher.card.number?.replace(/\D/g, "").slice(-4) ?? ""
    return [cipher.card.brand, ending === "" ? null : `•••• ${ending}`].filter(Boolean).join(" · ") || null
  }
  if (cipher.type === 4) return cipher.identity.email ?? cipher.identity.company ?? null
  return null
}
