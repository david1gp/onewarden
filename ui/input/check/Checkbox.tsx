import { mdiCheckboxBlankOutline } from "@adaptive-ds/mdi/mdiCheckboxBlankOutline.js"
import { mdiCheckboxMarked } from "@adaptive-ds/mdi/mdiCheckboxMarked.js"
import { type ComponentProps, splitProps } from "solid-js"
import { classesDisabledDirectly } from "#ui/classes/classesDisabledDirectly.js"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { classMerge } from "#ui/utils/classMerge.js"
import type { MayHaveChildren } from "#ui/utils/MayHaveChildren.js"
import type { MayHaveClass } from "#ui/utils/MayHaveClass.js"
import type { MayHaveDisabled } from "#ui/utils/MayHaveDisabled.js"

interface CheckboxProps extends MayHaveClass, MayHaveChildren, MayHaveDisabled, ComponentProps<"checkbox"> {
  id?: string
  checked: boolean
  onChange: (checked: boolean) => void
}

/** Accessible labeled checkbox driven by a controlled `checked`/`onChange` pair. */
export function Checkbox(p: CheckboxProps) {
  const [s, rest] = splitProps(p, ["id", "checked", "onChange", "disabled", "class", "children"])

  return (
    <div class={classMerge("flex items-start gap-1", s.class)}>
      <input
        id={s.id}
        type="checkbox"
        checked={s.checked}
        onChange={(e) => s.onChange(e.currentTarget.checked)}
        class="peer sr-only"
        disabled={s.disabled}
        {...rest}
      />
      <div
        class={classMerge(
          "flex size-6 items-center justify-center", // sizing + layout
          "peer-focus-visible:rounded-sm peer-focus-visible:ring-2 peer-focus-visible:ring-blue-600 peer-focus-visible:ring-offset-2", // focus
          s.disabled && classesDisabledDirectly, // disabled state
        )}
        aria-hidden="true"
      >
        <Icon path={s.checked ? mdiCheckboxMarked : mdiCheckboxBlankOutline} class="size-6 text-current" />
      </div>
      <label
        id={s.id ? `${s.id}-label` : undefined}
        for={s.id}
        class={classMerge(
          "cursor-pointer", // interaction
          s.disabled && classesDisabledDirectly, // disabled state
        )}
      >
        {s.children}
      </label>
    </div>
  )
}
