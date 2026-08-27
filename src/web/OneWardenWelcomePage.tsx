import { Badge } from "#ui/static/badge/Badge.jsx"
import { For } from "solid-js"
import { packageName } from "../packageName.js"
import { packageVersion } from "../packageVersion.js"
import { webDevelopmentCommands } from "./webDevelopmentCommands.js"
import { webImplementationStatus } from "./webImplementationStatus.js"

export function OneWardenWelcomePage() {
  return (
    <main class="mx-auto flex min-h-dvh max-w-3xl flex-col gap-10 px-6 py-16 text-slate-100">
      <header class="flex flex-col gap-3">
        <Badge class="self-start font-mono text-xs uppercase tracking-[0.2em]">
          {packageName} v{packageVersion}
        </Badge>
        <h1 class="text-3xl font-semibold tracking-tight">OneWarden</h1>
        <p class="text-slate-300">
          A backend-first, clean-room Bun and TypeScript foundation. This page is a development surface only: it does
          not implement or claim Bitwarden API compatibility, and it has no vault, account, or sign-in functionality.
        </p>
      </header>

      <section class="flex flex-col gap-4">
        <h2 class="text-lg font-semibold">What exists today</h2>
        <ul class="flex flex-col gap-2">
          <For each={webImplementationStatus}>
            {(entry) => (
              <li class="flex flex-col gap-1 rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4">
                <span class="w-56 shrink-0 font-medium">{entry.area}</span>
                <span class="flex-1 text-sm text-slate-300">{entry.detail}</span>
                <span
                  class="font-mono text-xs uppercase tracking-widest"
                  classList={{
                    "text-emerald-400": entry.state === "available",
                    "text-amber-400": entry.state === "planned",
                  }}
                >
                  {entry.state}
                </span>
              </li>
            )}
          </For>
        </ul>
      </section>

      <section class="flex flex-col gap-4">
        <h2 class="text-lg font-semibold">Local development</h2>
        <ul class="flex flex-col gap-2">
          <For each={webDevelopmentCommands}>
            {(entry) => (
              <li class="flex flex-col gap-1 rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4">
                <code class="w-56 shrink-0 font-mono text-sm text-sky-300">{entry.command}</code>
                <span class="flex-1 text-sm text-slate-300">{entry.description}</span>
              </li>
            )}
          </For>
        </ul>
        <p class="text-sm text-slate-400">
          The server listens on <code class="font-mono text-slate-300">ONEWARDEN_HOST</code> and{" "}
          <code class="font-mono text-slate-300">ONEWARDEN_PORT</code>, defaulting to 127.0.0.1:3000, and currently
          answers only <code class="font-mono text-slate-300">GET /alive</code>,{" "}
          <code class="font-mono text-slate-300">HEAD /alive</code>,{" "}
          <code class="font-mono text-slate-300">GET /api/alive</code>, and{" "}
          <code class="font-mono text-slate-300">GET /api/config</code>.
        </p>
      </section>
    </main>
  )
}
