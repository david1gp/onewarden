import * as v from "valibot"
import { createSignalObject, type SignalObject } from "#ui/utils/createSignalObject.js"

/**
 * A string signal mirrored into one URL search parameter.
 * Writes are scheduled on an idle frame and replace history so typing never grows the back stack.
 */
export function extensionFullWindowUrlSignalCreate(
  key: string,
  fallback = "",
  schema: v.GenericSchema = v.string(),
): SignalObject<string> {
  const signal = createSignalObject(urlParamRead(key, schema) ?? fallback)

  return {
    get: signal.get,
    set: (next: string) => {
      signal.set(next)
      urlParamWriteScheduled(key, next)
    },
  }
}

function urlParamRead(key: string, schema: v.GenericSchema): string | null {
  if (typeof window === "undefined") return null
  const value = new URLSearchParams(window.location.search).get(key)
  if (value === null) return null
  const parsed = v.safeParse(schema, value)
  if (!parsed.success || typeof parsed.output !== "string") return null
  return parsed.output
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
