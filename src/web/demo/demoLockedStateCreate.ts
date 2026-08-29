import { createSignalObject } from "#ui/utils/createSignalObject.js"

export function demoLockedStateCreate() {
  const masterPassword = createSignalObject("")
  const isUnlocked = createSignalObject(false)
  const isSubmitting = createSignalObject(false)

  const unlock = async (_password?: string) => {
    isSubmitting.set(true)
    await new Promise((resolve) => setTimeout(resolve, 200))
    isSubmitting.set(false)
    isUnlocked.set(true)
  }

  const lock = () => {
    isUnlocked.set(false)
    masterPassword.set("")
  }

  return {
    masterPassword: masterPassword.get,
    setMasterPassword: masterPassword.set,
    isUnlocked: isUnlocked.get,
    isSubmitting: isSubmitting.get,
    unlock,
    lock,
  }
}
