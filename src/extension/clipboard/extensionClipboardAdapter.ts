import type { Result } from "#result"

export interface ExtensionClipboardAdapter {
  copyText: (text: string) => Promise<Result<void>>
}
