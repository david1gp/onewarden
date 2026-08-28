type ExtensionRuntimeMessageListener = (
  message: unknown,
  sender: unknown,
  sendResponse: (response: unknown) => void,
) => boolean | undefined

export type ExtensionRuntimeAdapter = {
  onMessageAddListener: (listener: ExtensionRuntimeMessageListener) => void
  getURL: (path: string) => string
  getContexts: (filter: { documentUrls?: string[] }) => Promise<ExtensionRuntimeContext[]>
}

type ExtensionRuntimeContext = {
  tabId: number
  windowId: number
}
