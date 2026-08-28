type ExtensionTab = {
  id: number | undefined
  url: string | undefined
  windowId: number | undefined
}

type ExtensionTabsQuery = {
  active?: boolean
  lastFocusedWindow?: boolean
  url?: string
}

export type ExtensionTabsAdapter = {
  query: (query: ExtensionTabsQuery) => Promise<ExtensionTab[]>
  update: (tabId: number, updateProperties: { active?: boolean }) => Promise<void>
}
