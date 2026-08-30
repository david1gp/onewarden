import { mdiBrightnessAuto } from "@adaptive-ds/mdi/mdiBrightnessAuto.js"
import { mdiWeatherNight } from "@adaptive-ds/mdi/mdiWeatherNight.js"
import { mdiWhiteBalanceSunny } from "@adaptive-ds/mdi/mdiWhiteBalanceSunny.js"
import { onMount } from "solid-js"
import type { ButtonVariant } from "#ui/interactive/button/buttonCva.js"
import { themeInit, themeSet, themeSignal } from "#ui/interactive/theme/themeSignal.js"
import { type ThemeVariant, themeVariant } from "#ui/interactive/theme/themeVariant.js"

const options: readonly { id: ThemeVariant; label: string; icon: string }[] = [
  { id: themeVariant.light, label: "Light", icon: mdiWhiteBalanceSunny },
  { id: themeVariant.dark, label: "Dark", icon: mdiWeatherNight },
  { id: themeVariant.os, label: "Auto", icon: mdiBrightnessAuto },
]

export function adminThemeSelectorStateCreate() {
  onMount(themeInit)

  const optionSelect = (theme: ThemeVariant) => () => themeSet(theme, true)
  const optionVariant = (theme: ThemeVariant): ButtonVariant => (themeSignal.get() === theme ? "filledBlue" : "outline")

  return {
    options,
    currentTheme: themeSignal.get,
    optionSelect,
    optionVariant,
  }
}
