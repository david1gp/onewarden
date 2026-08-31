import { createMemo } from "solid-js"
import { createSignalObject, type SignalObject } from "#ui/utils/createSignalObject.js"
import { passwordGenerate } from "../../../shared/crypto/passwordGenerate.js"
import { cipherPasswordStrengthCalculate } from "../model/cipherPasswordStrengthCalculate.js"
import type { CipherFormData } from "../schemas/cipherFormDataSchema.js"

export interface CipherLoginFormSectionStateProps {
  usernameSignal: SignalObject<string>
  passwordSignal: SignalObject<string>
  totpSignal: SignalObject<string>
  uriSignal: SignalObject<string>
  urisSignal?: SignalObject<NonNullable<CipherFormData["uris"]>>
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
    const result = passwordGenerate()
    if (!result.success) return
    props.passwordSignal.set(result.data)
  }

  const updateUri = (index: number, uri: string) => {
    const urisSignal = props.urisSignal
    if (!urisSignal) {
      if (index === 0) props.uriSignal.set(uri)
      return
    }

    const uris = [...urisSignal.get()]
    const current = uris[index]
    if (!current) return
    uris[index] = { ...current, uri }
    urisSignal.set(uris)
    if (index === 0) props.uriSignal.set(uri)
  }

  const addUri = () => {
    const urisSignal = props.urisSignal
    if (!urisSignal) return
    const uris = urisSignal.get()
    if (uris.length === 0) {
      urisSignal.set([{ uri: props.uriSignal.get(), match: null }])
      return
    }
    urisSignal.set([...uris, { uri: "", match: null }])
  }

  const removeUri = (index: number) => {
    const urisSignal = props.urisSignal
    if (!urisSignal) return
    const uris = urisSignal.get().filter((_, uriIndex) => uriIndex !== index)
    urisSignal.set(uris)
    props.uriSignal.set(uris[0]?.uri ?? "")
  }

  return {
    usernameSignal: props.usernameSignal,
    passwordSignal: props.passwordSignal,
    totpSignal: props.totpSignal,
    uriSignal: props.uriSignal,
    urisSignal: props.urisSignal?.get,
    isPasswordRevealed: isPasswordRevealed.get,
    passwordStrength,
    togglePasswordReveal,
    generatePassword,
    updateUri,
    addUri,
    removeUri,
  }
}
