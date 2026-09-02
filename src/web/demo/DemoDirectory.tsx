import { For, type JSX } from "solid-js"
import { LinkButtonExternal } from "#ui/interactive/link/LinkButton.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { demoDirectoryStateCreate } from "./demoDirectoryStateCreate.js"
import { vaultSvgIcons } from "./vaultSvgIcons.js"

export function DemoDirectory(props: { readonly navigate?: (path: string) => void } = {}): JSX.Element {
  const state = demoDirectoryStateCreate(props)

  return (
    <div class="bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* biome-ignore lint/a11y/useValidAnchor: skip link shifts programmatic focus to main content */}
      <a
        href="#main-content"
        onClick={() => document.getElementById("main-content")?.focus()}
        class="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-blue-600 focus:px-3 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>
      {/* Top Banner Header */}
      <header class="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2.5">
                <div class="flex size-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
                  <Icon path={vaultSvgIcons.shieldCheck} class="size-5" />
                </div>
                <h1 class="font-bold text-2xl tracking-tight text-slate-900 dark:text-slate-50">
                  OneWarden UI Demo Directory
                </h1>
              </div>
              <p class="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
                Desktop-first password manager vault demo built with SolidJS and Tailwind CSS. Explore representative
                vault states, credential types, and zero-modal workflows.
              </p>
            </div>
            <Badge variant="subtle" class="text-sm px-2.5 py-1">
              Fictional Static Data
            </Badge>
          </div>
        </div>
      </header>

      {/* Directory Grid */}
      <main id="main-content" tabindex="-1" class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 focus:outline-none">
        <div class="mb-6 flex items-center justify-between">
          <h2 class="font-semibold text-lg text-slate-900 dark:text-slate-100">Representative Vault Views</h2>
          <span class="text-sm text-slate-600 dark:text-slate-400">{state.demos.length} Demo Pages</span>
        </div>

        <div class="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          <For each={state.demos}>
            {(demo) => (
              <LinkButtonExternal
                href={demo.path}
                onClick={state.navigateTo(demo.path)}
                variant="none"
                size="none"
                class="group block text-left font-normal transition-transform duration-150 hover:-translate-y-0.5 focus:outline-hidden"
              >
                <CardWrapper class="flex h-full flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition-shadow duration-150 group-hover:border-blue-500/50 group-hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:group-hover:border-blue-400/50">
                  <div>
                    <div class="flex items-center justify-between gap-2 pb-3">
                      <span class="font-medium text-sm text-blue-700 dark:text-blue-300">{demo.category}</span>
                      <Badge variant={demo.badgeVariant ?? "subtle"} class="text-sm">
                        {demo.badgeText}
                      </Badge>
                    </div>
                    <h3 class="font-bold text-base text-slate-900 group-hover:text-blue-700 dark:text-slate-50 dark:group-hover:text-blue-300">
                      {demo.title}
                    </h3>
                    <p class="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{demo.description}</p>
                  </div>

                  <div class="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-sm font-semibold text-blue-700 dark:border-slate-800 dark:text-blue-300">
                    <span>Open Demo View</span>
                    <Icon
                      path={vaultSvgIcons.chevronRight}
                      class="size-4 transition-transform group-hover:translate-x-1"
                    />
                  </div>
                </CardWrapper>
              </LinkButtonExternal>
            )}
          </For>
        </div>
      </main>
    </div>
  )
}
