import { For } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { adminThemeSelectorStateCreate } from "./adminThemeSelectorStateCreate.js"

export function AdminThemeSelector() {
  const state = adminThemeSelectorStateCreate()

  return (
    <fieldset class="flex flex-wrap items-center gap-1">
      <legend class="sr-only">Admin color theme</legend>
      <span aria-hidden="true" class="mr-1 text-sm font-medium text-slate-600 dark:text-slate-300">
        Theme
      </span>
      <For each={state.options}>
        {(option) => (
          <Button
            type="button"
            variant={state.optionVariant(option.id)}
            size="sm"
            class="h-8 px-2 text-sm"
            onClick={state.optionSelect(option.id)}
            aria-pressed={state.currentTheme() === option.id}
          >
            <Icon path={option.icon} class="mr-1.5 size-3.5" />
            {option.label}
          </Button>
        )}
      </For>
    </fieldset>
  )
}
