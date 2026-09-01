import * as v from "valibot"
import type { Result } from "#result"
import type { ExtensionCipher } from "../crypto/extensionCipherSchema.js"
import type { ExtensionAutofillPolicy } from "../storage/extensionAutofillPolicySchema.js"
import type { ExtensionAutofillBackgroundMessage } from "./extensionAutofillBackgroundMessageSchema.js"
import { extensionAutofillCandidatesCreate } from "./extensionAutofillCandidatesCreate.js"
import { extensionAutofillContentMessageSchema } from "./extensionAutofillContentMessageSchema.js"
import type { ExtensionAutofillFieldDescriptor } from "./extensionAutofillFieldDescriptorSchema.js"
import { extensionAutofillFillValuesCreate } from "./extensionAutofillFillValuesCreate.js"
import { extensionAutofillPageLoadCandidateSelect } from "./extensionAutofillPageLoadCandidateSelect.js"
import { extensionAutofillPortName } from "./extensionAutofillPortName.js"
import type { ExtensionCredentialCapturePrompt } from "./extensionCredentialCapturePromptSchema.js"

type BackgroundPort = {
  name: string
  sender?: { tab?: { id?: number }; frameId?: number; url?: string }
  postMessage: (message: unknown) => void
  disconnect: () => void
  onMessage: { addListener: (listener: (message: unknown) => void) => void }
  onDisconnect: { addListener: (listener: () => void) => void }
}
type BackgroundRuntime = {
  onConnect: { addListener: (listener: (port: BackgroundPort) => void) => void }
}
type ExtensionAutofillService = {
  start: () => Promise<Result<void>>
  syncSnapshotLoad: () => Promise<Result<{ ciphers: ExtensionCipher[] } | null>>
  cipherDetailRead: (request: { cipherId: string }) => Promise<Result<ExtensionCipher>>
  credentialCaptureAssess?: (request: unknown) => Promise<Result<ExtensionCredentialCapturePrompt | null>>
  credentialCaptureCommit?: (promptId: string) => Promise<Result<"saved" | "updated">>
  credentialCaptureDiscard?: (promptId: string) => Result<void>
}
type ExtensionAutofillPolicyStorage = {
  autofillPolicyLoad: () => Promise<Result<ExtensionAutofillPolicy | null>>
  autofillPolicySave?: (policy: ExtensionAutofillPolicy) => Promise<Result<void>>
}
type ExtensionAutofillConnection = {
  port: BackgroundPort
  documentId: string | null
  lastRevision: number
  fields: Map<string, ExtensionAutofillFieldDescriptor>
  requests: Map<
    string,
    { fieldId: string; revision: number; url: string; candidateIds: Set<string>; selecting: boolean }
  >
  pageLoadBusy: boolean
  pageLoadFilledForms: Set<string>
  credentialPrompts: Map<string, { promptId: string; revision: number; kind: "add" | "change" | "atRisk" }>
  credentialCaptureBusy: Set<string>
}

/** Owns per-frame matching and releases only selected, authorized values for immediate insertion. */
export function extensionAutofillBackgroundPortsCreate(
  runtime: BackgroundRuntime,
  options?: { service: ExtensionAutofillService; storage?: ExtensionAutofillPolicyStorage },
): {
  stopAll: (reason: "background" | "locked" | "logout" | "accountChanged") => void
  startAll: () => void
  connectionsCount: () => number
} {
  const connections = new Map<string, ExtensionAutofillConnection>()

  runtime.onConnect.addListener((port) => {
    if (port.name !== extensionAutofillPortName) return
    const tabId = port.sender?.tab?.id
    const frameId = port.sender?.frameId
    if (tabId === undefined || frameId === undefined || !extensionAutofillSenderUrlCheck(port.sender?.url)) {
      port.disconnect()
      return
    }
    const key = `${tabId}:${frameId}`
    const previous = connections.get(key)
    if (previous !== undefined && previous.port !== port) previous.port.disconnect()
    const connection: ExtensionAutofillConnection = {
      port,
      documentId: null,
      lastRevision: -1,
      fields: new Map(),
      requests: new Map(),
      pageLoadBusy: false,
      pageLoadFilledForms: new Set(),
      credentialPrompts: new Map(),
      credentialCaptureBusy: new Set(),
    }
    connections.set(key, connection)

    port.onMessage.addListener((rawMessage) => {
      if (connections.get(key)?.port !== port) return
      const parsed = v.safeParse(extensionAutofillContentMessageSchema, rawMessage)
      if (!parsed.success) return
      const message = parsed.output
      if (message.type === "autofill.ready") {
        if (connection.documentId !== null) return
        connection.documentId = message.documentId
        connection.lastRevision = message.revision
        extensionAutofillBackgroundMessagePost(port, {
          type: "autofill.start",
          documentId: message.documentId,
        })
        return
      }
      if (connection.documentId === null || message.documentId !== connection.documentId) return
      if (message.type === "autofill.fieldsChanged" || message.type === "autofill.navigation") {
        if (message.revision <= connection.lastRevision) return
        connection.lastRevision = message.revision
        connection.requests.clear()
        extensionCredentialPromptsClear(connection, options?.service)
        connection.fields =
          message.type === "autofill.fieldsChanged"
            ? new Map(message.fields.map((field) => [field.id, field]))
            : new Map()
        if (message.type === "autofill.navigation") connection.pageLoadFilledForms.clear()
        if (message.type === "autofill.fieldsChanged") {
          void extensionAutofillPageLoadHandle(
            connection,
            port.sender?.url,
            message,
            options?.service,
            options?.storage,
          )
        }
        return
      }
      if (message.type === "autofill.pageLoadFilled") {
        if (message.revision === connection.lastRevision && message.filledCount > 0) {
          connection.pageLoadFilledForms.add(message.formId)
        }
        return
      }
      if (message.type === "autofill.menuDismissed") {
        for (const [requestId, request] of connection.requests) {
          if (request.fieldId === message.fieldId) connection.requests.delete(requestId)
        }
        return
      }
      if (message.type === "autofill.candidatesRequest") {
        void extensionAutofillCandidatesHandle(connection, port.sender?.url, message, options?.service)
        return
      }
      if (message.type === "autofill.candidateSelected") {
        void extensionAutofillSelectionHandle(connection, message, options?.service)
        return
      }
      if (message.type === "autofill.credentialCapture") {
        void extensionCredentialCaptureHandle(connection, port.sender?.url, message, options?.service, options?.storage)
        return
      }
      if (message.type === "autofill.credentialPromptDecision") {
        void extensionCredentialDecisionHandle(connection, message, options?.service, options?.storage)
      }
    })
    port.onDisconnect.addListener(() => {
      if (connections.get(key)?.port === port) {
        extensionCredentialPromptsClear(connection, options?.service)
        connections.delete(key)
      }
    })
  })

  return {
    startAll: () => {
      for (const connection of connections.values()) {
        if (connection.documentId === null) continue
        extensionAutofillBackgroundMessagePost(connection.port, {
          type: "autofill.start",
          documentId: connection.documentId,
        })
      }
    },
    stopAll: (reason) => {
      for (const connection of connections.values()) {
        if (connection.documentId === null) continue
        extensionAutofillBackgroundMessagePost(connection.port, {
          type: "autofill.stop",
          documentId: connection.documentId,
          reason,
        })
        connection.fields.clear()
        connection.requests.clear()
        extensionCredentialPromptsClear(connection, options?.service)
      }
    },
    connectionsCount: () => connections.size,
  }
}

async function extensionCredentialCaptureHandle(
  connection: ExtensionAutofillConnection,
  senderUrl: string | undefined,
  message: Extract<v.InferOutput<typeof extensionAutofillContentMessageSchema>, { type: "autofill.credentialCapture" }>,
  service: ExtensionAutofillService | undefined,
  storage: ExtensionAutofillPolicyStorage | undefined,
): Promise<void> {
  if (
    service?.credentialCaptureAssess === undefined ||
    storage === undefined ||
    connection.documentId === null ||
    message.revision !== connection.lastRevision ||
    connection.credentialCaptureBusy.has(message.requestId)
  )
    return
  const trustedUrl = extensionAutofillRequestUrlResolve(senderUrl, message.url)
  const formFields = [...connection.fields.values()].filter((field) => field.formId === message.formId)
  if (
    trustedUrl === null ||
    !formFields.some((field) => field.kind === "currentPassword" || field.kind === "newPassword")
  )
    return
  const actionUrl = extensionCredentialActionUrlResolve(message.actionUrl, trustedUrl)
  if (actionUrl === null) return
  const policyResult = await storage.autofillPolicyLoad()
  if (!policyResult.success || extensionCredentialSiteSuppressed(policyResult.data, trustedUrl)) return
  connection.credentialCaptureBusy.add(message.requestId)
  const assessResult = await service.credentialCaptureAssess({
    captureId: `${connection.documentId}:${message.requestId}`,
    url: trustedUrl,
    actionUrl,
    method: message.method,
    cause: message.cause,
    username: message.username,
    password: message.password,
  })
  connection.credentialCaptureBusy.delete(message.requestId)
  if (!assessResult.success || assessResult.data === null) return
  if (message.revision !== connection.lastRevision) {
    service.credentialCaptureDiscard?.(assessResult.data.id)
    return
  }
  while (connection.credentialPrompts.size >= 5) {
    const first = connection.credentialPrompts.entries().next().value
    if (first === undefined) break
    service.credentialCaptureDiscard?.(first[1].promptId)
    connection.credentialPrompts.delete(first[0])
  }
  connection.credentialPrompts.set(message.requestId, {
    promptId: assessResult.data.id,
    revision: message.revision,
    kind: assessResult.data.kind,
  })
  extensionAutofillBackgroundMessagePost(connection.port, {
    type: "autofill.credentialPrompt",
    documentId: connection.documentId,
    revision: message.revision,
    requestId: message.requestId,
    prompt: assessResult.data,
  })
}

async function extensionCredentialDecisionHandle(
  connection: ExtensionAutofillConnection,
  message: Extract<
    v.InferOutput<typeof extensionAutofillContentMessageSchema>,
    { type: "autofill.credentialPromptDecision" }
  >,
  service: ExtensionAutofillService | undefined,
  storage: ExtensionAutofillPolicyStorage | undefined,
): Promise<void> {
  const pending = connection.credentialPrompts.get(message.requestId)
  if (
    pending === undefined ||
    service?.credentialCaptureDiscard === undefined ||
    pending.promptId !== message.promptId ||
    pending.revision !== message.revision ||
    message.revision !== connection.lastRevision
  )
    return
  connection.credentialPrompts.delete(message.requestId)
  if (message.decision === "accept" && pending.kind !== "atRisk" && service.credentialCaptureCommit !== undefined) {
    const result = await service.credentialCaptureCommit(pending.promptId)
    extensionCredentialOutcomePost(
      connection,
      message,
      result.success ? result.data : result.statusCode === 401 ? "locked" : "unavailable",
    )
    return
  }
  service.credentialCaptureDiscard(pending.promptId)
  if (message.decision === "neverSite" && storage?.autofillPolicySave !== undefined) {
    const policyResult = await storage.autofillPolicyLoad()
    const site = extensionCredentialSiteRead(connection.port.sender?.url)
    if (policyResult.success && site !== null) {
      const policy = policyResult.data ?? { pageLoadEnabled: false, disabledSites: [] }
      const saveResult = await storage.autofillPolicySave({
        ...policy,
        disabledSites: [...new Set([...policy.disabledSites, site])].slice(0, 500),
      })
      extensionCredentialOutcomePost(connection, message, saveResult.success ? "suppressed" : "unavailable")
      return
    }
  }
  extensionCredentialOutcomePost(connection, message, "dismissed")
}

function extensionCredentialOutcomePost(
  connection: ExtensionAutofillConnection,
  message: Extract<
    v.InferOutput<typeof extensionAutofillContentMessageSchema>,
    { type: "autofill.credentialPromptDecision" }
  >,
  status: "saved" | "updated" | "dismissed" | "suppressed" | "stale" | "locked" | "unavailable",
): void {
  if (connection.documentId === null) return
  extensionAutofillBackgroundMessagePost(connection.port, {
    type: "autofill.credentialOutcome",
    documentId: connection.documentId,
    revision: message.revision,
    requestId: message.requestId,
    promptId: message.promptId,
    status,
  })
}

function extensionCredentialPromptsClear(
  connection: ExtensionAutofillConnection,
  service: ExtensionAutofillService | undefined,
): void {
  if (service !== undefined) {
    for (const prompt of connection.credentialPrompts.values()) service.credentialCaptureDiscard?.(prompt.promptId)
  }
  connection.credentialPrompts.clear()
  connection.credentialCaptureBusy.clear()
}

function extensionCredentialActionUrlResolve(actionUrl: string, trustedUrl: string): string | null {
  try {
    const action = new URL(actionUrl, trustedUrl)
    if (action.protocol !== "http:" && action.protocol !== "https:") return null
    return action.href
  } catch {
    return null
  }
}

function extensionCredentialSiteRead(url: string | undefined): string | null {
  try {
    const parsed = new URL(url ?? "")
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null
    return parsed.hostname
      .toLowerCase()
      .replace(/^www\./u, "")
      .replace(/\.$/u, "")
  } catch {
    return null
  }
}

function extensionCredentialSiteSuppressed(policy: ExtensionAutofillPolicy | null, url: string): boolean {
  const site = extensionCredentialSiteRead(url)
  return site !== null && policy?.disabledSites.includes(site) === true
}

async function extensionAutofillPageLoadHandle(
  connection: ExtensionAutofillConnection,
  senderUrl: string | undefined,
  message: Extract<v.InferOutput<typeof extensionAutofillContentMessageSchema>, { type: "autofill.fieldsChanged" }>,
  service: ExtensionAutofillService | undefined,
  storage: ExtensionAutofillPolicyStorage | undefined,
): Promise<void> {
  if (connection.pageLoadBusy || service === undefined || storage === undefined) return
  connection.pageLoadBusy = true
  try {
    const trustedUrl = extensionAutofillRequestUrlResolve(senderUrl, message.url)
    if (trustedUrl === null || message.revision !== connection.lastRevision) return
    const policyResult = await storage.autofillPolicyLoad()
    if (!policyResult.success || policyResult.data === null) return
    const startResult = await service.start()
    if (!startResult.success) return
    const snapshotResult = await service.syncSnapshotLoad()
    if (!snapshotResult.success || snapshotResult.data === null || message.revision !== connection.lastRevision) return
    const groups = new Map<string, ExtensionAutofillFieldDescriptor[]>()
    for (const field of message.fields) {
      const group = groups.get(field.formId) ?? []
      group.push(field)
      groups.set(field.formId, group)
    }
    for (const [formId, fields] of groups) {
      if (connection.pageLoadFilledForms.has(formId) || message.revision !== connection.lastRevision) continue
      const anchor = fields.find((field) => field.kind === "username")
      if (anchor === undefined) continue
      const candidates = extensionAutofillCandidatesCreate(snapshotResult.data.ciphers, trustedUrl, "username")
      const selected = extensionAutofillPageLoadCandidateSelect(policyResult.data, trustedUrl, fields, candidates)
      if (selected === null) continue
      const detailResult = await service.cipherDetailRead({ cipherId: selected.id })
      if (!detailResult.success || message.revision !== connection.lastRevision) continue
      const revalidated = extensionAutofillCandidatesCreate([detailResult.data], trustedUrl, "username")
      if (revalidated.length !== 1 || revalidated[0]?.id !== selected.id || detailResult.data.type !== 1) continue
      const values = extensionAutofillFillValuesCreate(detailResult.data).filter(
        (value) => value.kind === "username" || value.kind === "currentPassword",
      )
      if (values.length === 0) continue
      const requestId = `page-load:${message.revision}:${formId}`
      extensionAutofillBackgroundMessagePost(connection.port, {
        type: "autofill.pageLoadFill",
        documentId: message.documentId,
        revision: message.revision,
        fieldId: anchor.id,
        formId,
        requestId,
        candidateType: 1,
        values,
      })
    }
  } finally {
    connection.pageLoadBusy = false
  }
}

async function extensionAutofillCandidatesHandle(
  connection: ExtensionAutofillConnection,
  senderUrl: string | undefined,
  message: Extract<v.InferOutput<typeof extensionAutofillContentMessageSchema>, { type: "autofill.candidatesRequest" }>,
  service: ExtensionAutofillService | undefined,
): Promise<void> {
  if (connection.documentId === null || message.revision !== connection.lastRevision) return
  const field = connection.fields.get(message.fieldId)
  if (field === undefined || service === undefined) {
    extensionAutofillCandidatesStatusPost(connection, message, "unavailable")
    return
  }
  const trustedUrl = extensionAutofillRequestUrlResolve(senderUrl, message.url)
  if (trustedUrl === null) {
    extensionAutofillCandidatesStatusPost(connection, message, "unavailable")
    return
  }
  const startResult = await service.start()
  if (!startResult.success) {
    extensionAutofillCandidatesStatusPost(
      connection,
      message,
      startResult.statusCode === 401 ? "locked" : "unavailable",
    )
    return
  }
  const snapshotResult = await service.syncSnapshotLoad()
  if (!snapshotResult.success || snapshotResult.data === null) {
    extensionAutofillCandidatesStatusPost(
      connection,
      message,
      !snapshotResult.success && snapshotResult.statusCode === 401 ? "locked" : "unavailable",
    )
    return
  }
  if (message.revision !== connection.lastRevision || connection.fields.get(message.fieldId)?.kind !== field.kind)
    return
  const candidates = extensionAutofillCandidatesCreate(snapshotResult.data.ciphers, trustedUrl, field.kind)
  connection.requests.set(message.requestId, {
    fieldId: message.fieldId,
    revision: message.revision,
    url: trustedUrl,
    candidateIds: new Set(
      candidates.filter((candidate) => candidate.permission !== "restricted").map((candidate) => candidate.id),
    ),
    selecting: false,
  })
  extensionAutofillBackgroundMessagePost(connection.port, {
    type: "autofill.candidates",
    documentId: message.documentId,
    revision: message.revision,
    fieldId: message.fieldId,
    requestId: message.requestId,
    status: "ready",
    candidates,
  })
}

async function extensionAutofillSelectionHandle(
  connection: ExtensionAutofillConnection,
  message: Extract<v.InferOutput<typeof extensionAutofillContentMessageSchema>, { type: "autofill.candidateSelected" }>,
  service: ExtensionAutofillService | undefined,
): Promise<void> {
  const request = connection.requests.get(message.requestId)
  const field = connection.fields.get(message.fieldId)
  if (
    service === undefined ||
    request === undefined ||
    field === undefined ||
    request.fieldId !== message.fieldId ||
    request.revision !== message.revision ||
    message.revision !== connection.lastRevision ||
    request.selecting ||
    !request.candidateIds.has(message.candidateId)
  ) {
    extensionAutofillFillRejectedPost(connection, message, "stale")
    return
  }
  request.selecting = true
  const detailResult = await service.cipherDetailRead({ cipherId: message.candidateId })
  if (connection.requests.get(message.requestId) !== request || connection.lastRevision !== message.revision) return
  connection.requests.delete(message.requestId)
  if (!detailResult.success) {
    extensionAutofillFillRejectedPost(
      connection,
      message,
      detailResult.statusCode === 401 ? "locked" : detailResult.statusCode === 403 ? "permission" : "unavailable",
    )
    return
  }
  const candidates = extensionAutofillCandidatesCreate([detailResult.data], request.url, field.kind)
  if (candidates[0]?.id !== message.candidateId || detailResult.data.type !== message.candidateType) {
    extensionAutofillFillRejectedPost(connection, message, "permission")
    return
  }
  const values = extensionAutofillFillValuesCreate(detailResult.data)
  if (values.length === 0) {
    extensionAutofillFillRejectedPost(connection, message, "unavailable")
    return
  }
  extensionAutofillBackgroundMessagePost(connection.port, {
    type: "autofill.fill",
    documentId: message.documentId,
    revision: message.revision,
    fieldId: message.fieldId,
    requestId: message.requestId,
    candidateType: message.candidateType,
    values,
  })
}

function extensionAutofillCandidatesStatusPost(
  connection: ExtensionAutofillConnection,
  message: Extract<v.InferOutput<typeof extensionAutofillContentMessageSchema>, { type: "autofill.candidatesRequest" }>,
  status: "locked" | "unavailable",
): void {
  extensionAutofillBackgroundMessagePost(connection.port, {
    type: "autofill.candidates",
    documentId: message.documentId,
    revision: message.revision,
    fieldId: message.fieldId,
    requestId: message.requestId,
    status,
    candidates: [],
  })
}

function extensionAutofillFillRejectedPost(
  connection: ExtensionAutofillConnection,
  message: Extract<v.InferOutput<typeof extensionAutofillContentMessageSchema>, { type: "autofill.candidateSelected" }>,
  reason: "locked" | "permission" | "stale" | "unavailable",
): void {
  if (connection.documentId === null) return
  extensionAutofillBackgroundMessagePost(connection.port, {
    type: "autofill.fillRejected",
    documentId: connection.documentId,
    revision: message.revision,
    fieldId: message.fieldId,
    requestId: message.requestId,
    reason,
  })
}

function extensionAutofillRequestUrlResolve(senderUrl: string | undefined, requestedUrl: string): string | null {
  try {
    const sender = new URL(senderUrl ?? "")
    const requested = new URL(requestedUrl)
    if (!["http:", "https:"].includes(requested.protocol)) return null
    if (!["http:", "https:"].includes(sender.protocol) || sender.origin !== requested.origin) return null
    return requested.href
  } catch {
    return null
  }
}

function extensionAutofillBackgroundMessagePost(
  port: BackgroundPort,
  message: ExtensionAutofillBackgroundMessage,
): void {
  try {
    port.postMessage(message)
  } catch {
    // A disconnected frame is removed by its onDisconnect callback.
  }
}

function extensionAutofillSenderUrlCheck(url: string | undefined): boolean {
  if (url === undefined) return false
  try {
    const protocol = new URL(url).protocol
    return ["http:", "https:", "about:", "blob:", "data:"].includes(protocol)
  } catch {
    return false
  }
}
