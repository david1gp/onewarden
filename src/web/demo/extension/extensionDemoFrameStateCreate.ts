import { createSignalObject } from "#ui/utils/createSignalObject.js"

export function extensionDemoFrameStateCreate(initialTheme: () => "light" | "dark") {
  const themeSignal = createSignalObject<"light" | "dark">(initialTheme())

  return {
    theme: themeSignal.get,
    themeSet: themeSignal.set,
  }
}
