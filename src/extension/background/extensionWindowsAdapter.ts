type ExtensionWindow = {
  id: number | undefined
}

export type ExtensionWindowsAdapter = {
  create: (createData: { focused?: boolean; type?: "normal"; url?: string }) => Promise<ExtensionWindow>
  update: (windowId: number, updateInfo: { focused?: boolean }) => Promise<void>
}
