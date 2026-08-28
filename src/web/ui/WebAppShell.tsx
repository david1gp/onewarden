import type { JSX } from "solid-js"

export function WebAppShell(props: { children: JSX.Element }): JSX.Element {
  return (
    <div class="flex min-h-dvh flex-col bg-white text-slate-900">
      <a
        href="#main-content"
        class="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:rounded focus:bg-slate-900 focus:px-3 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>
      <header class="border-b border-slate-200 px-6 py-4">
        <p class="text-lg font-semibold">OneWarden</p>
      </header>
      <main id="main-content" class="flex-1 px-6 py-8">
        {props.children}
      </main>
      <footer class="border-t border-slate-200 px-6 py-4 text-sm text-slate-600">
        <p>OneWarden</p>
      </footer>
    </div>
  )
}
