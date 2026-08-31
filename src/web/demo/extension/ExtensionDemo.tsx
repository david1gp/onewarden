import { For, type JSX } from "solid-js"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { ExtensionFullWindowView } from "../../../extension/fullwindow/ExtensionFullWindowView.jsx"
import { ExtensionPasskeyConsentApp } from "../../../extension/passkey-consent/ExtensionPasskeyConsentApp.jsx"
import { ExtensionPopupView } from "../../../extension/popup/ExtensionPopupView.jsx"
import { extensionDemoFixtures } from "./extensionDemoFixtures.js"

export function ExtensionDemo(): JSX.Element {
  return (
    <main class="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6 dark:bg-slate-900 dark:text-slate-100">
      <div class="mx-auto flex max-w-7xl flex-col gap-12">
        <header>
          <p class="font-semibold text-blue-700 text-sm dark:text-blue-300">Visual gallery</p>
          <h1 class="mt-1 font-bold text-3xl tracking-tight">Extension surfaces</h1>
          <p class="mt-2 max-w-3xl text-slate-600 text-sm dark:text-slate-300">
            Deterministic browser-only fixtures for reviewing production extension views. Actions stay local and do not
            contact the extension runtime.
          </p>
        </header>

        <GallerySection title="Popup" description="Browser-action states at the production popup width.">
          <div class="grid items-start gap-6 lg:grid-cols-2 xl:grid-cols-3">
            <For each={extensionDemoFixtures.popupModels}>
              {(fixture) => (
                <DemoFrame label={fixture.label} class="overflow-auto">
                  <ExtensionPopupView
                    root="div"
                    navigationLabel={`Popup · ${fixture.label} navigation`}
                    model={fixture.model}
                    commands={extensionDemoFixtures.popupCommands}
                  />
                </DemoFrame>
              )}
            </For>
          </div>
        </GallerySection>

        <GallerySection
          title="Full-window vault, generator, and settings"
          description="Production full-window panes and their representative loading, feedback, selection, and error states."
        >
          <div class="flex flex-col gap-8">
            <For each={extensionDemoFixtures.fullWindowModels}>
              {(fixture) => (
                <DemoFrame label={fixture.label} class="max-h-[48rem] overflow-auto" scrollable>
                  <ExtensionFullWindowView
                    idPrefix={fixture.idPrefix}
                    root="div"
                    navigationLabel={`Full-window · ${fixture.label} navigation`}
                    model={() => fixture.model}
                    commands={extensionDemoFixtures.fullWindowCommands}
                    initialState={fixture.initialState}
                    generatorOptions={extensionDemoFixtures.generatorOptions}
                  />
                </DemoFrame>
              )}
            </For>
          </div>
        </GallerySection>

        <GallerySection
          title="Passkey consent"
          description="Compact confirmation-window variants without runtime messaging or window APIs."
        >
          <div class="grid items-start gap-6 lg:grid-cols-2 xl:grid-cols-3">
            <For each={extensionDemoFixtures.passkey}>
              {(fixture) => (
                <DemoFrame label={fixture.label} class="h-[30rem] overflow-auto" scrollable>
                  <ExtensionPasskeyConsentApp root="div" options={fixture.options} />
                </DemoFrame>
              )}
            </For>
          </div>
        </GallerySection>
      </div>
    </main>
  )
}

function GallerySection(p: { title: string; description: string; children: JSX.Element }): JSX.Element {
  return (
    <section class="flex flex-col gap-4">
      <div>
        <h2 class="font-semibold text-xl">{p.title}</h2>
        <p class="mt-1 text-slate-600 text-sm dark:text-slate-300">{p.description}</p>
      </div>
      {p.children}
    </section>
  )
}

function DemoFrame(p: { label: string; class?: string; scrollable?: boolean; children: JSX.Element }): JSX.Element {
  return (
    <CardWrapper
      aria-label={`${p.label} frame`}
      class="overflow-hidden border border-slate-300 bg-slate-200 p-0 shadow-sm dark:border-slate-700 dark:bg-slate-800"
    >
      <p class="border-slate-300 border-b px-4 py-2 font-medium text-sm dark:border-slate-700">{p.label}</p>
      <div class={p.class} tabindex={p.scrollable ? 0 : undefined}>
        {p.children}
      </div>
    </CardWrapper>
  )
}
