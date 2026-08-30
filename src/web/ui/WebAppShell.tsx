import type { JSX } from "solid-js"

export function WebAppShell(props: { children: JSX.Element; headerAction?: JSX.Element }): JSX.Element {
  return (
    <div class="flex min-h-dvh flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* biome-ignore lint/a11y/useValidAnchor: skip link shifts programmatic focus to main content */}
      <a
        href="#main-content"
        onClick={() => document.getElementById("main-content")?.focus()}
        class="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-blue-600 focus:px-3 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>
      <header class="border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 sm:px-6 sm:py-4">
        <div class="mx-auto flex max-w-6xl flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p class="font-bold text-lg tracking-tight text-slate-900 dark:text-slate-50">OneWarden</p>
          {props.headerAction}
        </div>
      </header>
      <main id="main-content" tabindex="-1" class="flex-1 focus:outline-none">
        {props.children}
      </main>
      <footer class="border-t border-slate-200 bg-white px-4 py-4 text-center text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 sm:px-6">
        <p>OneWarden Vault</p>
      </footer>
    </div>
  )
}
