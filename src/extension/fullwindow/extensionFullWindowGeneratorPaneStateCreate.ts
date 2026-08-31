import { createMemo, type JSX } from "solid-js"
import { createSignalObject, type SignalObject } from "#ui/utils/createSignalObject.js"
import { passwordGenerate } from "../../shared/crypto/passwordGenerate.js"

type PasswordCopyStatus = "idle" | "copying" | "copied" | "error"

/** Local controls and secure generation state for the full-window password generator. */
export function extensionFullWindowGeneratorPaneStateCreate() {
  const lengthSignal = createSignalObject(20)
  const lowercaseSignal = createSignalObject(true)
  const uppercaseSignal = createSignalObject(true)
  const numbersSignal = createSignalObject(true)
  const symbolsSignal = createSignalObject(true)
  const passwordSignal = createSignalObject("")
  const passwordVisibleSignal = createSignalObject(false)
  const copyStatusSignal = createSignalObject<PasswordCopyStatus>("idle")
  const errorMessageSignal = createSignalObject<string | null>(null)

  const enabledCharacterGroupCount = createMemo(
    () =>
      Number(lowercaseSignal.get()) +
      Number(uppercaseSignal.get()) +
      Number(numbersSignal.get()) +
      Number(symbolsSignal.get()),
  )

  const passwordRegenerate = () => {
    const result = passwordGenerate({
      length: lengthSignal.get(),
      characterPolicy: {
        lowercase: lowercaseSignal.get(),
        uppercase: uppercaseSignal.get(),
        numbers: numbersSignal.get(),
        symbols: symbolsSignal.get(),
      },
    })
    if (!result.success) {
      errorMessageSignal.set(result.errorMessage)
      return
    }
    passwordSignal.set(result.data)
    copyStatusSignal.set("idle")
    errorMessageSignal.set(null)
  }

  const characterGroupSet = (signal: SignalObject<boolean>, enabled: boolean) => {
    if (!enabled && enabledCharacterGroupCount() === 1) return
    signal.set(enabled)
    passwordRegenerate()
  }

  const lowercaseSet = (enabled: boolean) => characterGroupSet(lowercaseSignal, enabled)
  const uppercaseSet = (enabled: boolean) => characterGroupSet(uppercaseSignal, enabled)
  const numbersSet = (enabled: boolean) => characterGroupSet(numbersSignal, enabled)
  const symbolsSet = (enabled: boolean) => characterGroupSet(symbolsSignal, enabled)
  const lowercaseDisabled = createMemo(() => lowercaseSignal.get() && enabledCharacterGroupCount() === 1)
  const uppercaseDisabled = createMemo(() => uppercaseSignal.get() && enabledCharacterGroupCount() === 1)
  const numbersDisabled = createMemo(() => numbersSignal.get() && enabledCharacterGroupCount() === 1)
  const symbolsDisabled = createMemo(() => symbolsSignal.get() && enabledCharacterGroupCount() === 1)

  const passwordVisibilityToggle = () => passwordVisibleSignal.set(!passwordVisibleSignal.get())
  const passwordLengthSet = (length: number) => {
    if (!Number.isFinite(length)) return
    lengthSignal.set(Math.min(128, Math.max(5, Math.trunc(length))))
    passwordRegenerate()
  }
  const passwordLengthInput: JSX.EventHandlerUnion<HTMLInputElement, InputEvent> = (event) =>
    passwordLengthSet(Number(event.currentTarget.value))

  const passwordCopy = async () => {
    copyStatusSignal.set("copying")
    if (!navigator.clipboard) {
      copyStatusSignal.set("error")
      return
    }
    try {
      await navigator.clipboard.writeText(passwordSignal.get())
      copyStatusSignal.set("copied")
    } catch {
      copyStatusSignal.set("error")
    }
  }

  passwordRegenerate()

  return {
    lengthSignal,
    lowercase: lowercaseSignal.get,
    uppercase: uppercaseSignal.get,
    numbers: numbersSignal.get,
    symbols: symbolsSignal.get,
    lowercaseSet,
    uppercaseSet,
    numbersSet,
    symbolsSet,
    lowercaseDisabled,
    uppercaseDisabled,
    numbersDisabled,
    symbolsDisabled,
    password: passwordSignal.get,
    passwordVisible: passwordVisibleSignal.get,
    passwordVisibilityToggle,
    passwordLengthSet,
    passwordLengthInput,
    passwordRegenerate,
    passwordCopy,
    copyStatus: copyStatusSignal.get,
    errorMessage: errorMessageSignal.get,
  }
}
