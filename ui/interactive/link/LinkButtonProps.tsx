import type { ComponentProps } from "solid-js"
import type { ButtonCvaProps } from "#ui/interactive/button/buttonCva.js"
import type { MayHaveIsLoading } from "#ui/utils/MayHaveIsLoading.js"

/**
 * Style and content props for the anchor used by the link-button component.
 */
export interface ButtonAnchorProps extends ComponentProps<"a">, ButtonCvaProps, MayHaveIsLoading {
  /** Opens the link in a new tab and sets `rel="noopener noreferrer"`. */
  newTab?: boolean
  // icon
  icon?: string
  iconRight?: string
  iconClass?: string
}
