import { For, type JSX } from "solid-js"
import { ExtensionFullWindowView } from "../../../extension/fullwindow/ExtensionFullWindowView.jsx"
import { ExtensionPasskeyConsentApp } from "../../../extension/passkey-consent/ExtensionPasskeyConsentApp.jsx"
import { ExtensionPopupView } from "../../../extension/popup/ExtensionPopupView.jsx"
import { ExtensionDemoFrame } from "./ExtensionDemoFrame.jsx"
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
              {(fixture, index) => (
                <ExtensionDemoFrame
                  label={fixture.label}
                  initialTheme={index() % 2 === 0 ? "light" : "dark"}
                  frameClass="w-full max-w-90"
                >
                  {(theme, themeSet) => (
                    <ExtensionPopupView
                      root="div"
                      idPrefix={fixture.idPrefix}
                      navigationLabel={`Popup · ${fixture.label} navigation`}
                      model={fixture.model}
                      commands={extensionDemoFixtures.popupCommands}
                      theme={theme}
                      onThemeChange={themeSet}
                    />
                  )}
                </ExtensionDemoFrame>
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
              {(fixture, index) => (
                <ExtensionDemoFrame
                  label={fixture.label}
                  initialTheme={index() % 2 === 0 ? "light" : "dark"}
                  viewportClass="h-[min(48rem,75dvh)]"
                >
                  {() => (
                    <ExtensionFullWindowView
                      idPrefix={fixture.idPrefix}
                      root="div"
                      navigationLabel={`Full-window · ${fixture.label} navigation`}
                      model={() => fixture.model}
                      commands={extensionDemoFixtures.fullWindowCommands}
                      initialState={fixture.initialState}
                      generatorOptions={extensionDemoFixtures.generatorOptions}
                    />
                  )}
                </ExtensionDemoFrame>
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
              {(fixture, index) => (
                <ExtensionDemoFrame
                  label={fixture.label}
                  initialTheme={index() % 2 === 0 ? "light" : "dark"}
                  frameClass="w-full max-w-md"
                  viewportClass="h-[30rem]"
                >
                  {() => <ExtensionPasskeyConsentApp root="div" options={fixture.options} />}
                </ExtensionDemoFrame>
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
