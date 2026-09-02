import { For, Show, type JSX } from "solid-js"
import { LinkButtonExternal } from "#ui/interactive/link/LinkButton.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { vaultSvgIcons } from "./vaultSvgIcons.js"
import { type VaultDemoHeaderProps, vaultDemoHeaderStateCreate } from "./vaultDemoHeaderStateCreate.js"

export function VaultDemoHeader(props: VaultDemoHeaderProps): JSX.Element {
  const state = vaultDemoHeaderStateCreate(props)

  return (
    <header class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
      {/* biome-ignore lint/a11y/useValidAnchor: skip link shifts programmatic focus to main content */}
      <a
        href="#main-content"
        onClick={() => document.getElementById("main-content")?.focus()}
        class="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-blue-600 focus:px-3 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>
      <div class="flex items-center gap-3">
        <span class="sr-only">OneWarden</span>
        <LinkButtonExternal
          href={state.directoryPath}
          onClick={state.navigateTo(state.directoryPath)}
          variant="subtle"
          size="none"
          icon={vaultSvgIcons.arrowLeft}
          iconClass="size-3.5 mr-1.5"
          class="px-2.5 py-1 text-sm font-semibold"
        >
          Demo Index
        </LinkButtonExternal>
        <Show when={state.showTitle()}>
          <div class="hidden h-4 w-px bg-slate-200 sm:block dark:bg-slate-700" />
          <h1 class="font-semibold text-slate-900 dark:text-slate-100 text-sm">{state.title()}</h1>
          <Badge variant="subtle" class="hidden sm:inline-flex text-sm px-1.5 py-0">
            Presentation Mode
          </Badge>
        </Show>
      </div>

      <nav aria-label="Demo Views" class="flex flex-wrap items-center gap-1">
        <For each={state.demoLinks}>
          {(link) => {
            const isActive = () => state.currentDemo() === link.id
            return (
              <LinkButtonExternal
                href={link.path}
                onClick={state.navigateTo(link.path)}
                variant={isActive() ? "filledBlue" : "ghost"}
                size="none"
                class={`px-2 py-1 text-sm font-medium ${
                  isActive()
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                }`}
              >
                {link.label}
              </LinkButtonExternal>
            )
          }}
        </For>
      </nav>
    </header>
  )
}
