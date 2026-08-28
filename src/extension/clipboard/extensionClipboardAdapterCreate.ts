import type { Result } from "#result"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"
import type { ExtensionClipboardAdapter } from "./extensionClipboardAdapter.js"

export type ExtensionClipboardTarget = {
  writeText?: (text: string) => Promise<void>
}

export function extensionClipboardAdapterCreate(
  clipboard?: ExtensionClipboardTarget | null,
): ExtensionClipboardAdapter {
  const op = "extensionClipboardAdapter.copyText"
  return {
    copyText: async (text: string): Promise<Result<void>> => {
      const target =
        clipboard !== undefined ? clipboard : typeof navigator !== "undefined" ? navigator.clipboard : undefined
      if (typeof target?.writeText !== "function") {
        return resultErrorCreate(op, "Clipboard API is not available.")
      }
      try {
        await target.writeText(text)
        return resultCreate(undefined)
      } catch (err) {
        return resultErrorCreate(op, "Clipboard write failed.", {
          errorData: err instanceof Error ? err.message : String(err),
        })
      }
    },
  }
}
