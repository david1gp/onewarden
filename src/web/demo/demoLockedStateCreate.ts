import { createSignalObject } from "#ui/utils/createSignalObject.js"

export function demoLockedStateCreate() {
  const masterPassword = createSignalObject("")
  const isUnlocked = createSignalObject(false)
  const isSubmitting = createSignalObject(false)

  const unlock = (e?: Event) => {
    if (e) e.preventDefault()
    isSubmitting.set(true)
    setTimeout(() => {
      isSubmitting.set(false)
      isUnlocked.set(true)
    }, 200)
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
