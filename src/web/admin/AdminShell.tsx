import { For, type JSX } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { adminShellViewStateCreate } from "./adminShellViewStateCreate.js"

export function AdminShell<TSection extends string>(p: {
  title: string
  description: string
  sections: readonly { id: TSection; label: string; icon: string }[]
  activeSection: () => TSection
  onSelectSection: (section: TSection) => void
  children: JSX.Element
  badge?: JSX.Element
  headerActions?: JSX.Element
  contentIsMain?: boolean
}) {
  const state = adminShellViewStateCreate(p.activeSection, p.onSelectSection)

  return (
    <div class="min-h-full bg-slate-50 text-sm text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <section
        aria-labelledby="admin-page-title"
        class="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
      >
        <div class="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="min-w-0">
              <h1 id="admin-page-title" class="text-xl font-bold">
                {p.title}
              </h1>
              <p class="text-sm text-slate-600 dark:text-slate-400">{p.description}</p>
            </div>
            <div class="flex flex-wrap items-center justify-end gap-2">
              {p.badge}
              {p.headerActions}
            </div>
          </div>
        </div>
      </section>

      <div class="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 md:grid-cols-[13rem_minmax(0,1fr)] lg:px-8">
        <nav aria-label="Admin sections" class="flex flex-wrap gap-2 md:flex-col md:flex-nowrap">
          <For each={p.sections}>
            {(section) => (
              <Button
                type="button"
                variant={state.sectionVariant(section.id)}
                size="sm"
                class="h-8 shrink-0 justify-start text-sm"
                onClick={state.selectSection(section.id)}
                aria-current={p.activeSection() === section.id ? "page" : undefined}
              >
                <Icon path={section.icon} class="mr-1.5 size-3.5 shrink-0" />
                {section.label}
              </Button>
            )}
          </For>
        </nav>
        <div
          id={p.contentIsMain ? "main-content" : undefined}
          role={p.contentIsMain ? "main" : undefined}
          tabindex={p.contentIsMain ? -1 : undefined}
          class="min-w-0 focus:outline-none"
        >
          {p.children}
        </div>
      </div>
    </div>
  )
}
