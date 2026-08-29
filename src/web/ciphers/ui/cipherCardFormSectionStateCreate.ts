import { createMemo } from "solid-js"
import { createSignalObject, type SignalObject } from "#ui/utils/createSignalObject.js"
import { cipherCardBrandDetect } from "../model/cipherCardBrandDetect.js"

export interface CipherCardFormSectionStateProps {
  cardholderNameSignal: SignalObject<string>
  brandSignal: SignalObject<string>
  numberSignal: SignalObject<string>
  expMonthSignal: SignalObject<string>
  expYearSignal: SignalObject<string>
  codeSignal: SignalObject<string>
}

export function cipherCardFormSectionStateCreate(props: CipherCardFormSectionStateProps) {
  const isCodeRevealed = createSignalObject(false)

  const detectedBrand = createMemo(() => {
    const num = props.numberSignal.get()
    const detected = cipherCardBrandDetect(num)
    return detected !== "Unknown" ? detected : props.brandSignal.get() || "Card"
  })

  const toggleCodeReveal = () => {
    isCodeRevealed.set(!isCodeRevealed.get())
  }

  const brandOptions = () => [
    "Visa",
    "Mastercard",
    "American Express",
    "Discover",
    "JCB",
    "Diners Club",
    "UnionPay",
    "Other",
  ]

  const monthOptions = () => ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"]

  return {
    cardholderNameSignal: props.cardholderNameSignal,
    brandSignal: props.brandSignal,
    numberSignal: props.numberSignal,
    expMonthSignal: props.expMonthSignal,
    expYearSignal: props.expYearSignal,
    codeSignal: props.codeSignal,
    isCodeRevealed: isCodeRevealed.get,
    detectedBrand,
    toggleCodeReveal,
    brandOptions,
    monthOptions,
  }
}
