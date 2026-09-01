import type { Result } from "#result"
import { resultCreate } from "../../shared/result/resultCreate.js"
import { resultErrorCreate } from "../../shared/result/resultErrorCreate.js"

export async function extensionAttachmentDownload(fileName: string, bytes: Uint8Array): Promise<Result<void>> {
  const op = "extensionAttachmentDownload"
  let url: string | null = null
  try {
    url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/octet-stream" }))
    const downloads = (
      globalThis as typeof globalThis & {
        chrome?: {
          downloads?: {
            download: (options: { url: string; filename: string; saveAs: boolean }) => Promise<number>
          }
        }
      }
    ).chrome?.downloads
    if (downloads === undefined) {
      return resultErrorCreate(op, "Browser downloads permission is unavailable.", {
        code: "platform.unavailable",
        statusCode: 503,
      })
    }
    const safeFileName = fileName
      .replaceAll("\\", "/")
      .split("/")
      .pop()
      ?.split("")
      .filter((character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127)
      .join("")
      .trim()
    await downloads.download({ url, filename: safeFileName || "attachment", saveAs: true })
    return resultCreate(undefined)
  } catch {
    return resultErrorCreate(op, "Attachment download could not be started.", {
      code: "platform.unavailable",
      statusCode: 503,
    })
  } finally {
    if (url !== null) URL.revokeObjectURL(url)
  }
}
