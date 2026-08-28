import { createSignalObject, type SignalObject } from "#ui/utils/createSignalObject.js"

/**
 * A string signal mirrored into one URL search parameter.
 * Writes are scheduled on an idle frame and replace history so typing never grows the back stack.
 */
export function extensionFullWindowUrlSignalCreate(key: string, fallback = ""): SignalObject<string> {
  const signal = createSignalObject(urlParamRead(key) ?? fallback)

  return {
    get: signal.get,
    set: (next: string) => {
      signal.set(next)
      urlParamWriteScheduled(key, next)
    },
  }
}

function urlParamRead(key: string): string | null {
  if (typeof window === "undefined") return null
  return new URLSearchParams(window.location.search).get(key)
}

function urlParamWriteScheduled(key: string, value: string): void {
  if (typeof window === "undefined") return
  const write = () => {
    const url = new URL(window.location.href)
    if (value === "") url.searchParams.delete(key)
    else url.searchParams.set(key, value)
    window.history.replaceState(window.history.state, "", url)
  }
  const idle = window.requestIdleCallback
  if (idle) idle(write)
  else setTimeout(write, 0)
}
