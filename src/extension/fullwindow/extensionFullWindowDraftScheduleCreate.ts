import type { ExtensionCreateLoginRequest } from "../create/extensionCreateLoginRequestSchema.js"

const draftDelayMs = 500

/**
 * Debounces encrypted draft saves onto an idle frame so typing never writes on every keystroke.
 * The background owns encryption; this only decides when to hand a request over.
 */
export function extensionFullWindowDraftScheduleCreate(save: (request: ExtensionCreateLoginRequest) => void) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let pending: ExtensionCreateLoginRequest | null = null

  const flush = (): void => {
    const request = pending
    pending = null
    timer = null
    if (request === null) return
    const idle = globalThis.requestIdleCallback
    if (idle === undefined) {
      save(request)
      return
    }
    idle(() => save(request))
  }

  const cancel = (): void => {
    if (timer !== null) clearTimeout(timer)
    timer = null
    pending = null
  }

  const schedule = (request: ExtensionCreateLoginRequest): void => {
    pending = request
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(flush, draftDelayMs)
  }

  return { schedule, cancel }
}
