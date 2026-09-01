import * as v from "valibot"
import { sha256Digest } from "../../shared/crypto/sha256Digest.js"
import { extensionAutofillBackgroundMessageSchema } from "./extensionAutofillBackgroundMessageSchema.js"
import type { ExtensionAutofillContentMessage } from "./extensionAutofillContentMessageSchema.js"
import { extensionAutofillControlsFill } from "./extensionAutofillControlsFill.js"
import type { ExtensionAutofillFieldKind } from "./extensionAutofillFieldKindSchema.js"
import { extensionAutofillFieldsDiscover } from "./extensionAutofillFieldsDiscover.js"
import { extensionAutofillInlineMenuMount } from "./extensionAutofillInlineMenuMount.js"
import { extensionAutofillPortName } from "./extensionAutofillPortName.js"
import { extensionCredentialCaptureRead } from "./extensionCredentialCaptureRead.js"
import { extensionCredentialPromptMount } from "./extensionCredentialPromptMount.js"

const credentialCaptureDedupeWindowMs = 30_000
const credentialCaptureDedupeMax = 64

type PortEvent<T> = { addListener: (listener: T) => void; removeListener?: (listener: T) => void }
type AutofillPort = {
  postMessage: (message: unknown) => void
  disconnect: () => void
  onMessage: PortEvent<(message: unknown) => void>
  onDisconnect: PortEvent<() => void>
}
type AutofillContentContext = {
  document: Document
  window: Window
  connect: (name: string) => AutofillPort
  mutationObserverCreate: (callback: MutationCallback) => MutationObserver
  timeoutSet: (callback: () => void, delay: number) => number
  timeoutClear: (timer: number) => void
}

/** Starts the frame-local isolated-world autofill lifecycle and reconnects across MV3 worker suspension. */
export function extensionAutofillContentStart(
  context: AutofillContentContext = extensionAutofillContentContextCreate(),
): () => void {
  if (context.document.contentType !== "text/html") return () => {}

  const documentId = extensionAutofillDocumentIdCreate()
  const fieldIds = new WeakMap<HTMLElement, string>()
  const formIds = new WeakMap<HTMLElement, string>()
  const fields = new Map<string, HTMLElement>()
  const fieldKinds = new Map<string, ExtensionAutofillFieldKind>()
  const fieldFormIds = new Map<string, string>()
  const observers = new Map<Document | ShadowRoot, MutationObserver>()
  let fieldSequence = 0
  let formSequence = 0
  let revision = 0
  let signature = ""
  let currentUrl = context.window.location.href
  let port: AutofillPort | null = null
  let reconnectTimer: number | null = null
  let scanTimer: number | null = null
  let navigationTimer: number | null = null
  let started = false
  let destroyed = false
  let activeFieldId: string | null = null
  let activeRequestId: string | null = null
  let menu: ReturnType<typeof extensionAutofillInlineMenuMount> | null = null
  let credentialPrompt: ReturnType<typeof extensionCredentialPromptMount> | null = null
  let credentialPromptRequest: { requestId: string; promptId: string } | null = null
  let credentialPromptTimer: number | null = null
  const filledForms = new Set<string>()
  const dirtyCredentialForms = new Map<string, number>()
  const capturedFingerprints = new Map<string, number>()
  const captureFingerprintSalt = documentId

  const messagePost = (message: ExtensionAutofillContentMessage): void => {
    try {
      port?.postMessage(message)
    } catch {
      // A suspended MV3 worker is recovered by the disconnect/reconnect path.
    }
  }
  const fieldIdResolve = (control: HTMLElement): string => {
    const existing = fieldIds.get(control)
    if (existing !== undefined) return existing
    fieldSequence += 1
    const id = `${documentId}:${fieldSequence}`
    fieldIds.set(control, id)
    return id
  }
  const formIdResolve = (control: HTMLElement): string => {
    const root = control.getRootNode()
    const scope =
      (control.tagName === "FORM" ? control : control.closest("form")) ??
      (root instanceof ShadowRoot && root.host instanceof HTMLElement ? root.host : context.document.documentElement)
    const existing = formIds.get(scope)
    if (existing !== undefined) return existing
    formSequence += 1
    const id = `${documentId}:form:${formSequence}`
    formIds.set(scope, id)
    return id
  }
  const menuDismiss = (reason: "blur" | "escape" | "navigation" | "removed" | "stopped"): void => {
    const fieldId = activeFieldId
    activeFieldId = null
    activeRequestId = null
    const mounted = menu
    menu = null
    mounted?.dismiss(reason)
    if (fieldId !== null) messagePost({ type: "autofill.menuDismissed", documentId, fieldId, reason })
  }
  const menuMount = (fieldId: string, control: HTMLElement): void => {
    if (activeFieldId === fieldId && menu?.hostConnected()) return
    if (menu !== null) menuDismiss(menu.hostConnected() ? "blur" : "removed")
    activeFieldId = fieldId
    const requestId = extensionAutofillRequestIdCreate()
    activeRequestId = requestId
    menu = extensionAutofillInlineMenuMount({
      document: context.document,
      field: control,
      fieldId,
      onSelect: (candidate) => {
        if (activeFieldId !== fieldId || activeRequestId !== requestId) return
        menu?.statusRender("loading")
        messagePost({
          type: "autofill.candidateSelected",
          documentId,
          revision,
          fieldId,
          requestId,
          candidateId: candidate.id,
          candidateType: candidate.type,
        })
      },
      onDismiss: (reason) => {
        if (activeFieldId !== fieldId) return
        activeFieldId = null
        activeRequestId = null
        menu = null
        messagePost({ type: "autofill.menuDismissed", documentId, fieldId, reason })
      },
    })
    messagePost({
      type: "autofill.candidatesRequest",
      documentId,
      revision,
      fieldId,
      requestId,
      url: context.window.location.href,
    })
  }
  const credentialPromptDismiss = (notify: boolean): void => {
    const current = credentialPromptRequest
    credentialPromptRequest = null
    credentialPrompt?.dismiss()
    credentialPrompt = null
    if (credentialPromptTimer !== null) context.timeoutClear(credentialPromptTimer)
    credentialPromptTimer = null
    if (notify && current !== null) {
      messagePost({
        type: "autofill.credentialPromptDecision",
        documentId,
        revision,
        requestId: current.requestId,
        promptId: current.promptId,
        decision: "dismiss",
        totp: null,
      })
    }
  }
  const credentialPromptExpire = (): void => {
    const current = credentialPromptRequest
    credentialPromptRequest = null
    if (credentialPromptTimer !== null) context.timeoutClear(credentialPromptTimer)
    credentialPromptTimer = null
    if (current === null) return
    credentialPrompt?.statusRender("expired")
    credentialPromptTimer = context.timeoutSet(() => credentialPromptDismiss(false), 4_000)
    messagePost({
      type: "autofill.credentialPromptDecision",
      documentId,
      revision,
      requestId: current.requestId,
      promptId: current.promptId,
      decision: "expire",
      totp: null,
    })
  }
  const credentialCapturePost = (
    formId: string,
    method: "POST" | "PUT" | "PATCH",
    actionUrl: string,
    cause: "submit" | "programmaticSubmit" | "network",
  ): void => {
    if (!started || destroyed) return
    const currentTime = Date.now()
    const capture = extensionCredentialCaptureRead({ fields, fieldKinds, fieldFormIds, formId })
    if (capture === null) return
    void credentialCapturePostAsync(formId, method, actionUrl, cause, capture, currentTime)
  }
  const credentialCapturePostAsync = async (
    formId: string,
    method: "POST" | "PUT" | "PATCH",
    actionUrl: string,
    cause: "submit" | "programmaticSubmit" | "network",
    capture: { username: string | null; password: string },
    currentTime: number,
  ): Promise<void> => {
    const fingerprint = await credentialCaptureFingerprintCreate(
      captureFingerprintSalt,
      capture.username,
      capture.password,
    )
    if (!started || destroyed) return
    for (const [knownFingerprint, knownAt] of capturedFingerprints) {
      if (currentTime - knownAt > credentialCaptureDedupeWindowMs) capturedFingerprints.delete(knownFingerprint)
    }
    if (capturedFingerprints.has(fingerprint)) return
    while (capturedFingerprints.size >= credentialCaptureDedupeMax) {
      const first = capturedFingerprints.keys().next().value
      if (typeof first !== "string") break
      capturedFingerprints.delete(first)
    }
    capturedFingerprints.set(fingerprint, currentTime)
    messagePost({
      type: "autofill.credentialCapture",
      documentId,
      revision,
      formId,
      requestId: extensionAutofillRequestIdCreate(),
      url: context.window.location.href,
      actionUrl,
      method,
      cause,
      username: capture.username,
      password: capture.password,
    })
  }
  const rootsObserve = (): void => {
    const roots: Array<Document | ShadowRoot> = [context.document]
    const visited = new Set<Document | ShadowRoot>()
    while (roots.length > 0) {
      const root = roots.shift()
      if (root === undefined || visited.has(root)) continue
      visited.add(root)
      if (!observers.has(root)) {
        const observer = context.mutationObserverCreate(scanSchedule)
        observer.observe(root, {
          subtree: true,
          childList: true,
          attributes: true,
          attributeFilter: [
            "aria-hidden",
            "aria-label",
            "aria-labelledby",
            "autocomplete",
            "contenteditable",
            "disabled",
            "hidden",
            "id",
            "inert",
            "name",
            "placeholder",
            "readonly",
            "style",
            "type",
          ],
        })
        observers.set(root, observer)
      }
      for (const element of root.querySelectorAll<HTMLElement>("*")) {
        if (element.shadowRoot !== null) roots.push(element.shadowRoot)
      }
    }
    for (const [root, observer] of observers) {
      if (visited.has(root)) continue
      observer.disconnect()
      observers.delete(root)
    }
  }
  const fieldsScan = (): void => {
    if (!started || destroyed) return
    scanTimer = null
    const discovered = extensionAutofillFieldsDiscover(context.document, fieldIdResolve, formIdResolve)
    fields.clear()
    fieldKinds.clear()
    fieldFormIds.clear()
    for (const item of discovered) {
      fields.set(item.descriptor.id, item.control)
      fieldKinds.set(item.descriptor.id, item.descriptor.kind)
      fieldFormIds.set(item.descriptor.id, item.descriptor.formId)
    }
    rootsObserve()
    if (activeFieldId !== null) {
      const active = fields.get(activeFieldId)
      if (active === undefined) menuDismiss("removed")
      else if (!menu?.hostConnected()) menuMount(activeFieldId, active)
    }
    const descriptors = discovered.map((item) => item.descriptor)
    const nextSignature = JSON.stringify(descriptors)
    if (nextSignature === signature) return
    signature = nextSignature
    revision += 1
    messagePost({
      type: "autofill.fieldsChanged",
      documentId,
      revision,
      url: context.window.location.href,
      fields: descriptors,
    })
  }
  function scanSchedule(): void {
    if (!started || destroyed || scanTimer !== null) return
    scanTimer = context.timeoutSet(fieldsScan, 40)
  }
  const focusHandle = (event: FocusEvent): void => {
    if (!started) return
    const target = event.composedPath().find((item): item is HTMLElement => item instanceof HTMLElement)
    if (target === undefined) {
      if (menu !== null) menuDismiss("blur")
      return
    }
    if (target.closest("[data-onewarden-autofill='menu']") !== null) return
    let fieldId = fieldIds.get(target)
    if (
      fieldId === undefined &&
      target.matches(
        "input:not([type='button'],[type='checkbox'],[type='color'],[type='file'],[type='hidden'],[type='image'],[type='radio'],[type='range'],[type='reset'],[type='submit']), select, textarea, [contenteditable='true'][role='textbox'][autocomplete]",
      )
    ) {
      fieldsScan()
      fieldId = fieldIds.get(target)
    }
    if (fieldId === undefined) {
      if (menu !== null) menuDismiss("blur")
      return
    }
    if (fieldKinds.get(fieldId) === "unknown" || !fields.has(fieldId)) {
      if (menu !== null) menuDismiss("blur")
      return
    }
    menuMount(fieldId, target)
  }
  const inputHandle = (event: Event): void => {
    const target = event.composedPath().find((item): item is HTMLElement => item instanceof HTMLElement)
    if (target === undefined) return
    let fieldId = fieldIds.get(target)
    if (fieldId === undefined) {
      fieldsScan()
      fieldId = fieldIds.get(target)
    }
    if (fieldId === undefined) return
    const kind = fieldKinds.get(fieldId)
    if (kind !== "currentPassword" && kind !== "newPassword" && kind !== "confirmationPassword") return
    const formId = fieldFormIds.get(fieldId)
    if (formId !== undefined) dirtyCredentialForms.set(formId, Date.now())
  }
  const formSubmitHandle = (event: Event): void => {
    const form = event.target
    if (!(form instanceof HTMLElement) || form.tagName !== "FORM") return
    const formElement = form as HTMLFormElement
    fieldsScan()
    const formId = formIdResolve(formElement)
    const methodValue = (formElement.getAttribute("method") ?? "GET").toUpperCase()
    if (methodValue !== "POST" && methodValue !== "PUT" && methodValue !== "PATCH") return
    const actionUrl = urlResolve(formElement.getAttribute("action") ?? "", context.window.location.href)
    if (actionUrl === null) return
    credentialCapturePost(
      formId,
      methodValue,
      actionUrl,
      event.type === "onewarden:programmatic-submit" ? "programmaticSubmit" : "submit",
    )
  }
  const networkHandle = (event: MessageEvent): void => {
    if (event.source !== context.window || !networkMessageCheck(event.data)) return
    const now = Date.now()
    const recent = [...dirtyCredentialForms.entries()]
      .filter(([, changedAt]) => now - changedAt <= 30_000)
      .sort((left, right) => right[1] - left[1])[0]
    if (recent === undefined) return
    const actionUrl = urlResolve(event.data.url, context.window.location.href)
    if (actionUrl === null) return
    credentialCapturePost(recent[0], event.data.method, actionUrl, "network")
  }
  const navigationCheck = (): void => {
    if (!started || currentUrl === context.window.location.href) return
    currentUrl = context.window.location.href
    revision += 1
    signature = ""
    filledForms.clear()
    dirtyCredentialForms.clear()
    capturedFingerprints.clear()
    credentialPromptDismiss(true)
    if (menu !== null) menuDismiss("navigation")
    messagePost({ type: "autofill.navigation", documentId, revision })
    scanSchedule()
  }
  const monitoringStart = (): void => {
    if (started || destroyed) return
    started = true
    currentUrl = context.window.location.href
    context.document.addEventListener("focusin", focusHandle, true)
    context.document.addEventListener("input", inputHandle, true)
    context.document.addEventListener("change", inputHandle, true)
    context.document.addEventListener("submit", formSubmitHandle, true)
    context.document.addEventListener("onewarden:programmatic-submit", formSubmitHandle, true)
    context.window.addEventListener("message", networkHandle)
    context.window.addEventListener("popstate", navigationCheck)
    context.window.addEventListener("hashchange", navigationCheck)
    navigationTimer = context.window.setInterval(navigationCheck, 750)
    fieldsScan()
  }
  const monitoringStop = (reason: "stopped" | "navigation" = "stopped"): void => {
    if (!started) return
    started = false
    context.document.removeEventListener("focusin", focusHandle, true)
    context.document.removeEventListener("input", inputHandle, true)
    context.document.removeEventListener("change", inputHandle, true)
    context.document.removeEventListener("submit", formSubmitHandle, true)
    context.document.removeEventListener("onewarden:programmatic-submit", formSubmitHandle, true)
    context.window.removeEventListener("message", networkHandle)
    context.window.removeEventListener("popstate", navigationCheck)
    context.window.removeEventListener("hashchange", navigationCheck)
    if (navigationTimer !== null) context.window.clearInterval(navigationTimer)
    navigationTimer = null
    if (scanTimer !== null) context.timeoutClear(scanTimer)
    scanTimer = null
    for (const observer of observers.values()) observer.disconnect()
    observers.clear()
    fields.clear()
    fieldKinds.clear()
    fieldFormIds.clear()
    dirtyCredentialForms.clear()
    capturedFingerprints.clear()
    signature = ""
    if (menu !== null) menuDismiss(reason)
    credentialPromptDismiss(true)
  }
  const portConnect = (): void => {
    reconnectTimer = null
    if (destroyed || port !== null) return
    let nextPort: AutofillPort
    try {
      nextPort = context.connect(extensionAutofillPortName)
    } catch {
      reconnectTimer = context.timeoutSet(portConnect, 1_000)
      return
    }
    port = nextPort
    const messageHandle = (rawMessage: unknown): void => {
      const parsed = v.safeParse(extensionAutofillBackgroundMessageSchema, rawMessage)
      if (!parsed.success || parsed.output.documentId !== documentId) return
      if (parsed.output.type === "autofill.start") monitoringStart()
      if (parsed.output.type === "autofill.stop") monitoringStop()
      if (parsed.output.type === "autofill.scanNow") fieldsScan()
      if (
        parsed.output.type === "autofill.pageLoadFill" &&
        parsed.output.revision === revision &&
        !filledForms.has(parsed.output.formId) &&
        fields.get(parsed.output.fieldId) !== undefined
      ) {
        filledForms.add(parsed.output.formId)
        const filledCount = extensionAutofillControlsFill(
          fields,
          fieldKinds,
          parsed.output.fieldId,
          parsed.output.values,
        )
        messagePost({
          type: "autofill.pageLoadFilled",
          documentId,
          revision,
          formId: parsed.output.formId,
          requestId: parsed.output.requestId,
          filledCount,
        })
      }
      if (
        parsed.output.type === "autofill.candidates" &&
        parsed.output.fieldId === activeFieldId &&
        parsed.output.requestId === activeRequestId &&
        parsed.output.revision === revision
      ) {
        if (parsed.output.status === "locked") menu?.statusRender("locked")
        else if (parsed.output.status === "unavailable") menu?.statusRender("unavailable")
        else menu?.candidatesRender(parsed.output.candidates)
      }
      if (
        parsed.output.type === "autofill.fill" &&
        parsed.output.fieldId === activeFieldId &&
        parsed.output.requestId === activeRequestId
      ) {
        const filledCount = extensionAutofillControlsFill(
          fields,
          fieldKinds,
          parsed.output.fieldId,
          parsed.output.values,
        )
        const totp = parsed.output.values.find((value) => value.kind === "totp")
        if (filledCount === 0 && totp !== undefined) void context.window.navigator.clipboard?.writeText(totp.value)
        menuDismiss("blur")
      }
      if (
        parsed.output.type === "autofill.fillRejected" &&
        parsed.output.fieldId === activeFieldId &&
        parsed.output.requestId === activeRequestId
      ) {
        menu?.statusRender(
          parsed.output.reason === "locked"
            ? "locked"
            : parsed.output.reason === "permission"
              ? "permission"
              : "unavailable",
        )
      }
      if (parsed.output.type === "autofill.credentialPrompt" && parsed.output.revision === revision) {
        credentialPromptDismiss(true)
        credentialPromptRequest = { requestId: parsed.output.requestId, promptId: parsed.output.prompt.id }
        credentialPrompt = extensionCredentialPromptMount({
          document: context.document,
          prompt: parsed.output.prompt,
          onDecision: (decision, totp) => {
            const current = credentialPromptRequest
            if (current === null) return
            messagePost({
              type: "autofill.credentialPromptDecision",
              documentId,
              revision,
              requestId: current.requestId,
              promptId: current.promptId,
              decision,
              totp,
            })
            if (decision === "accept") credentialPrompt?.statusRender("saving")
            else credentialPromptRequest = null
          },
        })
        credentialPromptTimer = context.timeoutSet(credentialPromptExpire, 30_000)
      }
      if (
        parsed.output.type === "autofill.credentialOutcome" &&
        parsed.output.revision === revision &&
        parsed.output.requestId === credentialPromptRequest?.requestId &&
        parsed.output.promptId === credentialPromptRequest.promptId
      ) {
        if (credentialPromptTimer !== null) context.timeoutClear(credentialPromptTimer)
        credentialPromptTimer = context.timeoutSet(() => credentialPromptDismiss(false), 4_000)
        credentialPromptRequest = null
        if (parsed.output.status === "saved") credentialPrompt?.statusRender("saved")
        else if (parsed.output.status === "updated") credentialPrompt?.statusRender("updated")
        else if (parsed.output.status === "dismissed" || parsed.output.status === "suppressed") {
          credentialPromptDismiss(false)
        } else if (parsed.output.status === "expired") credentialPrompt?.statusRender("expired")
        else if (parsed.output.status === "stale") credentialPrompt?.statusRender("stale")
        else if (parsed.output.status === "locked") credentialPrompt?.statusRender("locked")
        else credentialPrompt?.statusRender("unavailable")
      }
    }
    const disconnectHandle = (): void => {
      if (port !== nextPort || destroyed) return
      port = null
      monitoringStop()
      reconnectTimer = context.timeoutSet(portConnect, 500)
    }
    nextPort.onMessage.addListener(messageHandle)
    nextPort.onDisconnect.addListener(disconnectHandle)
    messagePost({ type: "autofill.ready", documentId, revision })
  }
  const destroy = (): void => {
    if (destroyed) return
    monitoringStop()
    destroyed = true
    if (reconnectTimer !== null) context.timeoutClear(reconnectTimer)
    reconnectTimer = null
    port?.disconnect()
    port = null
    context.window.removeEventListener("pagehide", destroy)
  }

  context.window.addEventListener("pagehide", destroy, { once: true })
  portConnect()
  return destroy
}

function networkMessageCheck(value: unknown): value is {
  source: "onewarden.credential-capture.v1"
  type: "network"
  method: "POST" | "PUT" | "PATCH"
  url: string
} {
  if (typeof value !== "object" || value === null) return false
  const message = value as Record<string, unknown>
  return (
    message.source === "onewarden.credential-capture.v1" &&
    message.type === "network" &&
    (message.method === "POST" || message.method === "PUT" || message.method === "PATCH") &&
    typeof message.url === "string" &&
    message.url.length > 0 &&
    message.url.length <= 4_096
  )
}

function urlResolve(value: string, base: string): string | null {
  try {
    const url = new URL(value, base)
    if (url.protocol !== "http:" && url.protocol !== "https:") return null
    return url.href
  } catch {
    return null
  }
}

function extensionAutofillContentContextCreate(): AutofillContentContext {
  const extensionChrome = (
    globalThis as typeof globalThis & {
      chrome?: { runtime?: { connect: (options: { name: string }) => AutofillPort } }
    }
  ).chrome
  return {
    document,
    window,
    connect: (name) => {
      if (extensionChrome?.runtime === undefined) throw new Error("Extension runtime is unavailable.")
      return extensionChrome.runtime.connect({ name })
    },
    mutationObserverCreate: (callback) => new MutationObserver(callback),
    timeoutSet: (callback, delay) => window.setTimeout(callback, delay),
    timeoutClear: (timer) => window.clearTimeout(timer),
  }
}

function extensionAutofillDocumentIdCreate(): string {
  return globalThis.crypto?.randomUUID?.() ?? `frame-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function extensionAutofillRequestIdCreate(): string {
  return globalThis.crypto?.randomUUID?.() ?? `request-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

async function credentialCaptureFingerprintCreate(
  salt: string,
  username: string | null,
  password: string,
): Promise<string> {
  // Keep only the digest in the bounded dedupe map; raw values are not persisted or added to bridge metadata.
  const value = `${salt}\u0000${username ?? "<null>"}\u0000${password}`
  const digestResult = await sha256Digest(value)
  if (digestResult.success) {
    return Array.from(digestResult.data, (byte) => byte.toString(16).padStart(2, "0")).join("")
  }
  return credentialCaptureFingerprintFallbackCreate(value)
}

function credentialCaptureFingerprintFallbackCreate(value: string): string {
  let hash = 2_166_136_261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16_777_619)
  }
  return (hash >>> 0).toString(16)
}

const extensionAutofillChrome = (globalThis as typeof globalThis & { chrome?: { runtime?: { connect?: unknown } } })
  .chrome
if (typeof window !== "undefined" && extensionAutofillChrome?.runtime?.connect !== undefined) {
  extensionAutofillContentStart()
}
