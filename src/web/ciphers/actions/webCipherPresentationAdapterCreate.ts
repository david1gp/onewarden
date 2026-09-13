import type { CipherApiClientOptions } from "./cipherApiClientCreate.js"
import { cipherApiClientCreate } from "./cipherApiClientCreate.js"
import type { CipherPresentationAdapter } from "../ui/cipherPresentationAdapter.js"

export function webCipherPresentationAdapterCreate(options: CipherApiClientOptions = {}): CipherPresentationAdapter {
  const client = cipherApiClientCreate(options)

  return {
    ...client,
    copyToClipboard: async (value: string) => {
      if (typeof navigator === "undefined" || !navigator.clipboard) return
      await navigator.clipboard.writeText(value).catch(() => {})
    },
  }
}
