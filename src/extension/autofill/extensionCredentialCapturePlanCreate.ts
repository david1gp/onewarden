import type { ExtensionPersonalLoginCipher } from "../crypto/extensionPersonalLoginCipherSchema.js"
import { extensionPersonalLoginSiteMatch } from "../background/extensionPersonalLoginSiteMatch.js"
import type { ExtensionCredentialCaptureRequest } from "./extensionCredentialCaptureRequestSchema.js"

type CapturePlan =
  | { kind: "add"; cipher: ExtensionPersonalLoginCipher }
  | { kind: "change"; cipher: ExtensionPersonalLoginCipher }
  | { kind: "atRisk"; risk: "insecure" | "crossOrigin" | "readOnly" | "ambiguous" }
  | null

/** Compares a bounded page capture against decrypted login ciphers inside the background boundary. */
export function extensionCredentialCapturePlanCreate(
  request: ExtensionCredentialCaptureRequest,
  ciphers: readonly ExtensionPersonalLoginCipher[],
  now: number,
  idCreate: () => string,
): CapturePlan {
  const activeUrl = urlParse(request.url)
  const actionUrl = urlParse(request.actionUrl)
  if (activeUrl === null || activeUrl.protocol !== "https:") return { kind: "atRisk", risk: "insecure" }
  if (actionUrl === null || actionUrl.origin !== activeUrl.origin) return { kind: "atRisk", risk: "crossOrigin" }

  const matching = ciphers.filter((cipher) => extensionPersonalLoginSiteMatch(cipher, request.url))
  const usernameMatches = matching.filter((cipher) => cipher.login.username === request.username)
  if (usernameMatches.length > 1) return { kind: "atRisk", risk: "ambiguous" }
  const target = usernameMatches[0]
  if (target !== undefined) {
    if (target.login.password === request.password) return null
    if (target.edit === false || target.viewPassword === false) return { kind: "atRisk", risk: "readOnly" }
    const history = [...(target.passwordHistory ?? [])]
    if (target.login.password !== null && target.login.password !== "") {
      history.unshift({ password: target.login.password, lastUsedDate: new Date(now).toISOString() })
    }
    return {
      kind: "change",
      cipher: {
        ...target,
        login: { ...target.login, username: request.username, password: request.password },
        passwordHistory: history.slice(0, 20),
      },
    }
  }
  if (matching.length > 0) return { kind: "atRisk", risk: "ambiguous" }

  return {
    kind: "add",
    cipher: {
      object: "cipher",
      id: idCreate(),
      type: 1,
      revisionDate: new Date(now).toISOString(),
      deletedDate: null,
      organizationId: null,
      folderId: null,
      name: activeUrl.hostname.replace(/^www\./u, ""),
      notes: null,
      collectionIds: [],
      fields: [],
      login: {
        username: request.username,
        password: request.password,
        uris: [{ uri: activeUrl.origin, match: null }],
        uri: activeUrl.origin,
        totp: null,
        fido2Credentials: null,
      },
      passwordHistory: [],
    },
  }
}

function urlParse(value: string): URL | null {
  try {
    const url = new URL(value)
    if (url.protocol !== "http:" && url.protocol !== "https:") return null
    return url
  } catch {
    return null
  }
}
