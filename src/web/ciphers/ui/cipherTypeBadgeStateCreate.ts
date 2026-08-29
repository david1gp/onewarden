import { createMemo } from "solid-js"
import { cipherCategoryIconResolve } from "../model/cipherCategoryIconResolve.js"
import { cipherCategoryLabelResolve } from "../model/cipherCategoryLabelResolve.js"
import { cipherCategoryThemeResolve } from "../model/cipherCategoryThemeResolve.js"
import type { CipherCategory } from "../schemas/cipherCategorySchema.js"
import type { CipherType } from "../schemas/cipherTypeSchema.js"

export interface CipherTypeBadgeStateProps {
  type: () => CipherCategory | CipherType | string
}

export function cipherTypeBadgeStateCreate(props: CipherTypeBadgeStateProps) {
  const icon = createMemo(() => cipherCategoryIconResolve(props.type()))
  const label = createMemo(() => cipherCategoryLabelResolve(props.type()))
  const theme = createMemo(() => cipherCategoryThemeResolve(props.type()))

  return {
    icon,
    label,
    theme,
  }
}
