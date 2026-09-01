import { mdiCheck } from "@adaptive-ds/mdi/mdiCheck.js"
import { mdiContentCopy } from "@adaptive-ds/mdi/mdiContentCopy.js"
import { ButtonIcon } from "#ui/interactive/button/ButtonIcon.jsx"
import type { ButtonCvaProps } from "#ui/interactive/button/buttonCva.js"

export interface CopyActionButtonProps extends ButtonCvaProps {
  /** Renders the copied icon and copied labels while true. */
  isCopied?: boolean
  disabled?: boolean
  onCopy?: () => void
  /** Visible label in the idle state; omit to render an icon-only button. */
  label?: string
  /** Visible label while copied; falls back to `label`. */
  copiedLabel?: string
  /** Accessible name in the idle state. */
  ariaLabel?: string
  /** Accessible name while copied; falls back to `ariaLabel`. */
  copiedAriaLabel?: string
  class?: string
  iconClass?: string
}

/** Copy button toggling between copy and check icons with copied feedback. */
export function CopyActionButton(p: CopyActionButtonProps) {
  const label = () => (p.isCopied ? (p.copiedLabel ?? p.label) : p.label)
  const ariaLabel = () => (p.isCopied ? (p.copiedAriaLabel ?? p.ariaLabel) : p.ariaLabel)
  return (
    <ButtonIcon
      type="button"
      variant={p.variant ?? "subtle"}
      size={p.size}
      class={p.class}
      icon={p.isCopied ? mdiCheck : mdiContentCopy}
      iconClass={p.iconClass}
      disabled={p.disabled}
      aria-label={ariaLabel()}
      onClick={() => p.onCopy?.()}
    >
      {label()}
    </ButtonIcon>
  )
}
