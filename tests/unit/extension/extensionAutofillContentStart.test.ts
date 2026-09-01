import { expect, test } from "bun:test"
import { extensionAutofillContentStart } from "../../../src/extension/autofill/extensionAutofillContentStart.js"

function eventCreate<T extends (...args: never[]) => void>() {
  const listeners: T[] = []
  return {
    addListener: (listener: T) => listeners.push(listener),
    emit: (...args: Parameters<T>) => {
      for (const listener of listeners) listener(...args)
    },
  }
}

test("content lifecycle rescans mutations, handles SPA navigation, and tears down ephemeral UI", async () => {
  document.documentElement.innerHTML = `<head></head><body><input autocomplete="username"></body>`
  const detachedHost = document.createElement("div")
  detachedHost.attachShadow({ mode: "open" }).innerHTML = `<span>component</span>`
  document.body.append(detachedHost)
  const sent: unknown[] = []
  let observerDisconnects = 0
  const onMessage = eventCreate<(message: unknown) => void>()
  const onDisconnect = eventCreate<() => void>()
  const port = {
    postMessage: (message: unknown) => sent.push(message),
    disconnect: () => onDisconnect.emit(),
    onMessage,
    onDisconnect,
  }
  const stop = extensionAutofillContentStart({
    document,
    window,
    connect: () => port,
    mutationObserverCreate: (callback) => {
      const observer = new MutationObserver(callback)
      const disconnect = observer.disconnect.bind(observer)
      observer.disconnect = () => {
        observerDisconnects += 1
        disconnect()
      }
      return observer
    },
    timeoutSet: (callback, delay) => window.setTimeout(callback, delay),
    timeoutClear: (timer) => window.clearTimeout(timer),
  })
  const ready = sent[0] as { documentId: string }
  onMessage.emit({ type: "autofill.start", documentId: ready.documentId })

  const initialFields = sent.find((message) => (message as { type?: string }).type === "autofill.fieldsChanged") as {
    fields: unknown[]
  }
  expect(initialFields.fields).toHaveLength(1)

  const password = document.createElement("input")
  password.autocomplete = "current-password"
  password.type = "password"
  detachedHost.remove()
  document.body.append(password)
  await Bun.sleep(70)
  const fieldMessages = sent.filter((message) => (message as { type?: string }).type === "autofill.fieldsChanged")
  expect((fieldMessages.at(-1) as { fields: unknown[] }).fields).toHaveLength(2)
  expect(observerDisconnects).toBeGreaterThan(0)

  password.focus()
  expect(document.querySelector("[data-onewarden-autofill='menu']")).not.toBeNull()
  window.location.hash = "autofill-spa-test"
  window.dispatchEvent(new HashChangeEvent("hashchange"))
  expect(sent.some((message) => (message as { type?: string }).type === "autofill.navigation")).toBe(true)
  expect(document.querySelector("[data-onewarden-autofill='menu']")).toBeNull()

  const countBeforeStop = sent.length
  stop()
  document.body.append(document.createElement("input"))
  await Bun.sleep(70)
  expect(sent).toHaveLength(countBeforeStop)
})
