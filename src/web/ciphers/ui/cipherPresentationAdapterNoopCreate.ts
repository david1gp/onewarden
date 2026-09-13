import { resultErrorCreate } from "../../../shared/result/resultErrorCreate.js"
import type { CipherPresentationAdapter } from "./cipherPresentationAdapter.js"

export function cipherPresentationAdapterNoopCreate(): CipherPresentationAdapter {
  const unsupported = async (): Promise<{ success: false; op: string; errorMessage: string }> =>
    resultErrorCreate("cipherPresentationAdapterNoop", "No cipher adapter was injected.")

  return {
    list: () => unsupported(),
    get: () => unsupported(),
    create: () => unsupported(),
    update: () => unsupported(),
    favorite: () => unsupported(),
    softDelete: () => unsupported(),
    hardDelete: () => unsupported(),
    restore: () => unsupported(),
    archive: () => unsupported(),
    share: () => unsupported(),
    updateCollections: () => unsupported(),
    uploadAttachment: () => unsupported(),
    deleteAttachment: () => unsupported(),
    clone: () => unsupported(),
    copyToClipboard: () => undefined,
  }
}
