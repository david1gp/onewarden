type ExtensionWindow = {
  id: number | undefined
}

export type ExtensionWindowsAdapter = {
  create: (createData: {
    focused?: boolean
    type?: "normal" | "popup"
    url?: string
    width?: number
    height?: number
  }) => Promise<ExtensionWindow>
  update: (windowId: number, updateInfo: { focused?: boolean }) => Promise<void>
  onRemovedAddListener?: (listener: (windowId: number) => void) => void
}
