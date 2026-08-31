import { type Accessor, createMemo } from "solid-js"

export function extensionVaultStatusStateCreate<Status extends string, Login>(
  status: Accessor<Status>,
  statusValues: {
    readonly loading: Status
    readonly locked: Status
    readonly loggedOut: Status
    readonly error: Status
    readonly ready: Status
  },
  visibleLogins: Accessor<readonly Login[]>,
  allLogins: Accessor<readonly Login[]>,
) {
  const isLoading = createMemo(() => status() === statusValues.loading)
  const isLocked = createMemo(() => status() === statusValues.locked)
  const isLoggedOut = createMemo(() => status() === statusValues.loggedOut)
  const isError = createMemo(() => status() === statusValues.error)
  const isReady = createMemo(() => status() === statusValues.ready)
  const isEmpty = createMemo(() => isReady() && visibleLogins().length === 0)
  const hasNoLogins = createMemo(() => allLogins().length === 0)

  return { isLoading, isLocked, isLoggedOut, isError, isReady, isEmpty, hasNoLogins }
}
