import { extensionPopupStatus } from "./ExtensionPopupStatus.js"
import type { ExtensionPopupViewModel } from "./ExtensionPopupViewModel.js"

/** Initial popup read model used before background messaging is wired up. */
export function extensionPopupViewModelCreate(
  overrides: Partial<ExtensionPopupViewModel> = {},
): ExtensionPopupViewModel {
  return {
    status: extensionPopupStatus.loading,
    hostname: null,
    logins: [],
    errorMessage: null,
    busy: false,
    copiedFieldKey: null,
    fillAvailable: false,
    ...overrides,
  }
}
