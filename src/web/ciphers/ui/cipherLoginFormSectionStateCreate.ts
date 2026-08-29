import { createMemo } from "solid-js"
import { createSignalObject, type SignalObject } from "#ui/utils/createSignalObject.js"
import { cipherPasswordStrengthCalculate } from "../model/cipherPasswordStrengthCalculate.js"

export interface CipherLoginFormSectionStateProps {
  usernameSignal: SignalObject<string>
  passwordSignal: SignalObject<string>
  totpSignal: SignalObject<string>
  uriSignal: SignalObject<string>
}

export function cipherLoginFormSectionStateCreate(props: CipherLoginFormSectionStateProps) {
  const isPasswordRevealed = createSignalObject(false)

  const passwordStrength = createMemo(() => {
    const pw = props.passwordSignal.get()
    return cipherPasswordStrengthCalculate(pw)
  })

  const togglePasswordReveal = () => {
    isPasswordRevealed.set(!isPasswordRevealed.get())
  }

  const generatePassword = () => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-="
    const length = 20
    const values = new Uint32Array(length)
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      crypto.getRandomValues(values)
      let generated = ""
      for (let i = 0; i < length; i++) {
        const val = values[i]
        if (val !== undefined) {
          generated += charset[val % charset.length]
        }
      }
      props.passwordSignal.set(generated)
    }
  }

  return {
    usernameSignal: props.usernameSignal,
    passwordSignal: props.passwordSignal,
    totpSignal: props.totpSignal,
    uriSignal: props.uriSignal,
    isPasswordRevealed: isPasswordRevealed.get,
    passwordStrength,
    togglePasswordReveal,
    generatePassword,
  }
}
