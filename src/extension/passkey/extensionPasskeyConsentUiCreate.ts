import type { Result } from "#result"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import type { ExtensionCipher } from "../crypto/extensionCipherSchema.js"
import type { ExtensionPersonalLoginCipher } from "../crypto/extensionPersonalLoginCipherSchema.js"
import type { ExtensionPasskeyConsentContext } from "./extensionPasskeyConsentContextSchema.js"
import type { ExtensionPasskeyConsent } from "./extensionPasskeyConsentSchema.js"
import type { ExtensionPasskeyConsentUiModel } from "./extensionPasskeyConsentUiModelSchema.js"
import { extensionPasskeyCredentialIdDecode } from "./extensionPasskeyCredentialIdDecode.js"

type ConsentService = {
  unlock: (request: unknown) => Promise<Result<unknown>>
  syncSnapshotLoad: () => Promise<Result<{ ciphers: ExtensionCipher[] } | null>>
}

type ConsentWindows = {
  create: (data: { focused: boolean; type: "popup"; url: string; width: number; height: number }) => Promise<{
    id: number | undefined
  }>
  onRemovedAddListener?: (listener: (windowId: number) => void) => void
}

type PendingConsent = {
  context: ExtensionPasskeyConsentContext
  resolve: (consent: ExtensionPasskeyConsent | null) => void
  windowId: number | null
  verified: boolean
}

/** Owns passkey consent windows and keeps decrypted credential selection in the extension. */
export function extensionPasskeyConsentUiCreate(options: {
  service: ConsentService
  windows: ConsentWindows
  urlCreate: (path: string) => string
  now?: () => number
}) {
  const now = options.now ?? Date.now
  const pending = new Map<string, PendingConsent>()

  options.windows.onRemovedAddListener?.((windowId) => {
    const entry = [...pending.values()].find((candidate) => candidate.windowId === windowId)
    if (entry === undefined) return
    pending.delete(entry.context.requestId)
    entry.resolve(null)
  })

  const open = async (context: ExtensionPasskeyConsentContext): Promise<ExtensionPasskeyConsent | null> => {
    const prior = pending.get(context.requestId)
    if (prior !== undefined) {
      pending.delete(context.requestId)
      prior.resolve(null)
    }
    return new Promise((resolve) => {
      const entry: PendingConsent = { context, resolve, windowId: null, verified: false }
      pending.set(context.requestId, entry)
      const url = `${options.urlCreate("passkey-consent/index.html")}?request=${encodeURIComponent(context.requestId)}`
      void options.windows.create({ focused: true, type: "popup", url, width: 460, height: 640 }).then(
        (window) => {
          entry.windowId = window.id ?? null
        },
        () => {
          if (pending.delete(context.requestId)) resolve(null)
        },
      )
    })
  }

  const load = async (requestId: string): Promise<Result<ExtensionPasskeyConsentUiModel>> => {
    const entryResult = entryRead(requestId)
    if (!entryResult.success) return entryResult
    const entry = entryResult.data
    const verificationRequired = entry.context.userVerification === "required"
    if (verificationRequired && !entry.verified) return resultCreate(modelCreate(entry, [], false, true))
    const snapshotResult = await options.service.syncSnapshotLoad()
    if (!snapshotResult.success) {
      if (snapshotResult.statusCode === 401) return resultCreate(modelCreate(entry, [], true, verificationRequired))
      return snapshotResult
    }
    return resultCreate(
      modelCreate(
        entry,
        candidatesCreate(entry.context, loginCiphersRead(snapshotResult.data?.ciphers ?? [])),
        false,
        verificationRequired,
      ),
    )
  }

  const verify = async (requestId: string, password: string): Promise<Result<ExtensionPasskeyConsentUiModel>> => {
    const entryResult = entryRead(requestId)
    if (!entryResult.success) return entryResult
    const unlockResult = await options.service.unlock({ password })
    if (!unlockResult.success) return unlockResult
    entryResult.data.verified = true
    return load(requestId)
  }

  const approve = async (request: {
    requestId: string
    cipherId: string
    credentialId: string | null
    revisionDate: string
  }): Promise<Result<void>> => {
    const entryResult = entryRead(request.requestId)
    if (!entryResult.success) return entryResult
    const entry = entryResult.data
    if (entry.context.userVerification === "required" && !entry.verified)
      return forbidden("Fresh verification is required.")
    const snapshotResult = await options.service.syncSnapshotLoad()
    if (!snapshotResult.success) return snapshotResult
    const candidate = candidatesCreate(entry.context, loginCiphersRead(snapshotResult.data?.ciphers ?? [])).find(
      (value) => value.cipherId === request.cipherId && value.credentialId === request.credentialId,
    )
    if (candidate === undefined) return conflict("The selected credential is no longer available. Choose again.")
    if (candidate.readOnly) return forbidden("The selected organization login is read-only.")
    if (candidate.revisionDate !== request.revisionDate)
      return conflict("The selected login changed. Review it and confirm again.")
    pending.delete(request.requestId)
    entry.resolve({
      requestId: request.requestId,
      approved: true,
      userVerified: entry.verified,
      cipherId: entry.context.operation === "create" ? candidate.cipherId : undefined,
      credentialId: entry.context.operation === "get" ? candidate.credentialId : undefined,
    })
    return resultCreate(undefined)
  }

  const cancel = (requestId: string): Result<void> => {
    const entry = pending.get(requestId)
    if (entry === undefined) return resultCreate(undefined)
    pending.delete(requestId)
    entry.resolve(null)
    return resultCreate(undefined)
  }

  return { open, load, verify, approve, cancel }

  function entryRead(requestId: string): Result<PendingConsent> {
    const entry = pending.get(requestId)
    if (entry === undefined) return forbidden("Passkey request is no longer available.")
    if (entry.context.expiresAt > now()) return resultCreate(entry)
    pending.delete(requestId)
    entry.resolve(null)
    return forbidden("Passkey request expired.")
  }
}

function candidatesCreate(context: ExtensionPasskeyConsentContext, ciphers: ExtensionPersonalLoginCipher[]) {
  if (context.operation === "create") {
    return ciphers
      .filter((cipher) => cipher.deletedDate === null)
      .map((cipher) => ({
        cipherId: cipher.id,
        credentialId: null,
        revisionDate: cipher.revisionDate,
        name: cipher.name,
        userName: cipher.login.username,
        organization: cipher.organizationId !== null && cipher.organizationId !== undefined,
        readOnly: cipher.edit === false,
      }))
  }
  return ciphers.flatMap((cipher) =>
    cipher.deletedDate !== null
      ? []
      : (cipher.login.fido2Credentials ?? [])
          .filter((credential) => credential.rpId.toLowerCase().replace(/\.$/u, "") === context.rpId)
          .filter((credential) =>
            (context.allowCredentialIds ?? []).length === 0
              ? credential.discoverable
              : (context.allowCredentialIds ?? []).some((id) => credentialIdsMatch(id, credential.credentialId)),
          )
          .map((credential) => ({
            cipherId: cipher.id,
            credentialId: credential.credentialId,
            revisionDate: cipher.revisionDate,
            name: cipher.name,
            userName: credential.userName ?? cipher.login.username,
            organization: cipher.organizationId !== null && cipher.organizationId !== undefined,
            readOnly: cipher.edit === false && credential.counter > 0,
          })),
  )
}

function loginCiphersRead(ciphers: readonly ExtensionCipher[]): ExtensionPersonalLoginCipher[] {
  return ciphers.filter(
    (cipher): cipher is ExtensionPersonalLoginCipher => cipher.type === 1 || cipher.type === undefined,
  )
}

function modelCreate(
  entry: PendingConsent,
  candidates: ExtensionPasskeyConsentUiModel["candidates"],
  locked: boolean,
  verificationRequired: boolean,
): ExtensionPasskeyConsentUiModel {
  return {
    requestId: entry.context.requestId,
    operation: entry.context.operation,
    rpId: entry.context.rpId,
    rpName: entry.context.rpName,
    userName: entry.context.userName,
    verificationRequired,
    verified: entry.verified,
    locked,
    expiresAt: entry.context.expiresAt,
    candidates,
  }
}

function credentialIdsMatch(left: string, right: string): boolean {
  const leftResult = extensionPasskeyCredentialIdDecode(left)
  const rightResult = extensionPasskeyCredentialIdDecode(right)
  return (
    leftResult.success &&
    rightResult.success &&
    leftResult.data.byteLength === rightResult.data.byteLength &&
    leftResult.data.every((byte, index) => byte === rightResult.data[index])
  )
}

function forbidden<T>(message: string): Result<T> {
  return resultErrorCreate("extensionPasskeyConsentUi", message, { code: "platform.forbidden", statusCode: 403 })
}

function conflict<T>(message: string): Result<T> {
  return resultErrorCreate("extensionPasskeyConsentUi", message, { code: "platform.conflict", statusCode: 409 })
}
