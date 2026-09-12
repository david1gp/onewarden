import type { JSX } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { classMerge } from "#ui/utils/classMerge.js"
import { extensionDemoFrameStateCreate } from "./extensionDemoFrameStateCreate.js"

export function ExtensionDemoFrame(p: {
  label: string
  initialTheme?: "light" | "dark"
  frameClass?: string
  viewportClass?: string
  children: (theme: () => "light" | "dark", themeSet: (theme: "light" | "dark") => void) => JSX.Element
}): JSX.Element {
  const state = extensionDemoFrameStateCreate(() => p.initialTheme ?? "light")

  return (
    <CardWrapper
      aria-label={`${p.label} frame`}
      class={classMerge(
        "overflow-hidden border border-slate-300 bg-slate-200 p-0 shadow-sm dark:border-slate-700 dark:bg-slate-800",
        p.frameClass,
      )}
    >
      <div class="flex min-h-11 flex-wrap items-center justify-between gap-2 border-slate-300 border-b px-3 py-2 dark:border-slate-700">
        <p class="font-medium text-sm">{p.label}</p>
        <fieldset
          aria-label={`${p.label} preview theme`}
          data-extension-theme-source="host"
          class="extension-theme-root flex gap-1 border-0 p-0"
        >
          <Button
            size="sm"
            variant="outline"
            class="extension-selected-control"
            aria-pressed={state.theme() === "light"}
            onClick={() => state.themeSet("light")}
          >
            Light
          </Button>
          <Button
            size="sm"
            variant="outline"
            class="extension-selected-control"
            aria-pressed={state.theme() === "dark"}
            onClick={() => state.themeSet("dark")}
          >
            Dark
          </Button>
        </fieldset>
      </div>
      <section
        aria-label={`${p.label} preview`}
        tabindex="0"
        data-extension-demo-preview={p.label}
        data-extension-theme={state.theme()}
        class={classMerge(
          "extension-theme-root isolate overflow-auto [&>.extension-page-surface]:min-h-full",
          state.theme() === "dark" ? "dark" : undefined,
          p.viewportClass,
        )}
        style={{ "background-color": "var(--color-background)", color: "var(--color-foreground)" }}
      >
        {p.children(state.theme, state.themeSet)}
      </section>
    </CardWrapper>
  )
}
