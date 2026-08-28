import type { Result } from "#result"
import type { ExtensionLoginFillData } from "../fill/extensionLoginFillDataSchema.js"

type ExtensionScriptingTarget = {
  tabId: number
  frameId?: number
}

type ExtensionLoginFillCredentials = {
  username: string | null
  password: string | null
}

export type ExtensionScriptingAdapter = {
  executeScript: (
    target: ExtensionScriptingTarget,
    credentials: ExtensionLoginFillCredentials,
  ) => Promise<Result<ExtensionLoginFillData>>
}
