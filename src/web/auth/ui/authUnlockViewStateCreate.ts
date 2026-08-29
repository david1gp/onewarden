import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { webAuthSessionCreate } from "../model/webAuthSessionCreate.js"
import { webAuthSessionDefault } from "../model/webAuthSessionDefault.js"

export interface AuthUnlockViewProps {
  session?: ReturnType<typeof webAuthSessionCreate>
  onUnlocked?: () => void
  onLoggedOut?: () => void
}

export function authUnlockViewStateCreate(props: AuthUnlockViewProps = {}) {
  const session = props.session ?? webAuthSessionDefault()
  const errorMessage = createSignalObject<string | null>(null)
  const isSubmitting = createSignalObject(false)

  const handleUnlock = async (masterPassword: string): Promise<void> => {
    errorMessage.set(null)
    isSubmitting.set(true)
    const result = await session.unlock(masterPassword)
    isSubmitting.set(false)
    if (!result.success) {
      errorMessage.set(result.errorMessage || "Invalid master password.")
      return
    }
    props.onUnlocked?.()
  }

  const handleLogout = (): void => {
    session.logout()
    props.onLoggedOut?.()
  }

  return {
    email: () => session.session()?.email ?? null,
    errorMessage: errorMessage.get,
    isSubmitting: isSubmitting.get,
    handleUnlock,
    handleLogout,
  }
}
