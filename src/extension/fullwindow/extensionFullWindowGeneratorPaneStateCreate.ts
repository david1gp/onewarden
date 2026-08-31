import { createMemo, type JSX } from "solid-js"
import { createSignalObject, type SignalObject } from "#ui/utils/createSignalObject.js"
import { passwordGenerate } from "../../shared/crypto/passwordGenerate.js"

type PasswordCopyStatus = "idle" | "copying" | "copied" | "error"

/** Local controls and secure generation state for the full-window password generator. */
export function extensionFullWindowGeneratorPaneStateCreate(
  options: {
    initialPassword?: string
    initialPasswordVisible?: boolean
    initialCopyStatus?: PasswordCopyStatus
    initialErrorMessage?: string | null
    passwordGenerate?: typeof passwordGenerate
    clipboardWrite?: (value: string) => Promise<void>
  } = {},
) {
  const lengthSignal = createSignalObject(20)
  const lowercaseSignal = createSignalObject(true)
  const uppercaseSignal = createSignalObject(true)
  const numbersSignal = createSignalObject(true)
  const symbolsSignal = createSignalObject(true)
  const passwordSignal = createSignalObject(options.initialPassword ?? "")
  const passwordVisibleSignal = createSignalObject(options.initialPasswordVisible ?? false)
  const copyStatusSignal = createSignalObject<PasswordCopyStatus>(options.initialCopyStatus ?? "idle")
  const errorMessageSignal = createSignalObject<string | null>(options.initialErrorMessage ?? null)

  const enabledCharacterGroupCount = createMemo(
    () =>
      Number(lowercaseSignal.get()) +
      Number(uppercaseSignal.get()) +
      Number(numbersSignal.get()) +
      Number(symbolsSignal.get()),
  )

  const passwordRegenerate = () => {
    const result = (options.passwordGenerate ?? passwordGenerate)({
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
    const clipboardWrite = options.clipboardWrite ?? navigator.clipboard?.writeText.bind(navigator.clipboard)
    if (clipboardWrite === undefined) {
      copyStatusSignal.set("error")
      return
    }
    try {
      await clipboardWrite(passwordSignal.get())
      copyStatusSignal.set("copied")
    } catch {
      copyStatusSignal.set("error")
    }
  }

  if (options.initialPassword === undefined) passwordRegenerate()

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
