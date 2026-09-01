import * as v from "valibot"
import { extensionAutofillBackgroundMessageSchema } from "./extensionAutofillBackgroundMessageSchema.js"
import type { ExtensionAutofillContentMessage } from "./extensionAutofillContentMessageSchema.js"
import { extensionAutofillFieldsDiscover } from "./extensionAutofillFieldsDiscover.js"
import { extensionAutofillInlineMenuMount } from "./extensionAutofillInlineMenuMount.js"
import { extensionAutofillPortName } from "./extensionAutofillPortName.js"

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
  const fields = new Map<string, HTMLElement>()
  const fieldKinds = new Map<string, string>()
  const observers = new Map<Document | ShadowRoot, MutationObserver>()
  let fieldSequence = 0
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
  let menu: ReturnType<typeof extensionAutofillInlineMenuMount> | null = null

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
  const menuDismiss = (reason: "blur" | "escape" | "navigation" | "removed" | "stopped"): void => {
    const fieldId = activeFieldId
    activeFieldId = null
    const mounted = menu
    menu = null
    mounted?.dismiss(reason)
    if (fieldId !== null) messagePost({ type: "autofill.menuDismissed", documentId, fieldId, reason })
  }
  const menuMount = (fieldId: string, control: HTMLElement): void => {
    if (activeFieldId === fieldId && menu?.hostConnected()) return
    if (menu !== null) menuDismiss(menu.hostConnected() ? "blur" : "removed")
    activeFieldId = fieldId
    menu = extensionAutofillInlineMenuMount({
      document: context.document,
      field: control,
      fieldId,
      onDismiss: (reason) => {
        if (activeFieldId !== fieldId) return
        activeFieldId = null
        menu = null
        messagePost({ type: "autofill.menuDismissed", documentId, fieldId, reason })
      },
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
    const discovered = extensionAutofillFieldsDiscover(context.document, fieldIdResolve)
    fields.clear()
    fieldKinds.clear()
    for (const item of discovered) {
      fields.set(item.descriptor.id, item.control)
      fieldKinds.set(item.descriptor.id, item.descriptor.kind)
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
    messagePost({ type: "autofill.fieldsChanged", documentId, revision, fields: descriptors })
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
  const navigationCheck = (): void => {
    if (!started || currentUrl === context.window.location.href) return
    currentUrl = context.window.location.href
    revision += 1
    signature = ""
    if (menu !== null) menuDismiss("navigation")
    messagePost({ type: "autofill.navigation", documentId, revision })
    scanSchedule()
  }
  const monitoringStart = (): void => {
    if (started || destroyed) return
    started = true
    currentUrl = context.window.location.href
    context.document.addEventListener("focusin", focusHandle, true)
    context.window.addEventListener("popstate", navigationCheck)
    context.window.addEventListener("hashchange", navigationCheck)
    navigationTimer = context.window.setInterval(navigationCheck, 750)
    fieldsScan()
  }
  const monitoringStop = (reason: "stopped" | "navigation" = "stopped"): void => {
    if (!started) return
    started = false
    context.document.removeEventListener("focusin", focusHandle, true)
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
    signature = ""
    if (menu !== null) menuDismiss(reason)
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

const extensionAutofillChrome = (globalThis as typeof globalThis & { chrome?: { runtime?: { connect?: unknown } } })
  .chrome
if (typeof window !== "undefined" && extensionAutofillChrome?.runtime?.connect !== undefined) {
  extensionAutofillContentStart()
}
