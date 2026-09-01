import { For, type JSX, Show } from "solid-js"
import { InputS } from "#ui/input/input/InputS.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { TextareaS } from "#ui/input/textarea/TextareaS.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { LoaderShuffle4Dots } from "#ui/static/loaders/LoaderShuffle4Dots.jsx"
import { ExtensionFullWindowAssignmentPanel } from "./ExtensionFullWindowAssignmentPanel.jsx"
import { ExtensionFullWindowCipherExtras } from "./ExtensionFullWindowCipherExtras.jsx"
import type { ExtensionFullWindowCommands } from "./ExtensionFullWindowCommands.js"
import type { ExtensionFullWindowViewModel } from "./ExtensionFullWindowViewModel.js"
import { extensionFullWindowIdentityStateCreate } from "./extensionFullWindowIdentityStateCreate.js"

type IdentityFormField = {
  key:
    | "title"
    | "firstName"
    | "middleName"
    | "lastName"
    | "address1"
    | "address2"
    | "address3"
    | "city"
    | "state"
    | "postalCode"
    | "country"
    | "company"
    | "email"
    | "phone"
    | "ssn"
    | "username"
    | "passportNumber"
    | "licenseNumber"
  label: string
  autocomplete?: string
  inputmode?: "email" | "tel" | "numeric"
}

const identityFormSections: Array<{ title: string; fields: IdentityFormField[] }> = [
  {
    title: "Personal information",
    fields: [
      { key: "title", label: "Title", autocomplete: "honorific-prefix" },
      { key: "firstName", label: "First name", autocomplete: "given-name" },
      { key: "middleName", label: "Middle name", autocomplete: "additional-name" },
      { key: "lastName", label: "Last name", autocomplete: "family-name" },
      { key: "company", label: "Company", autocomplete: "organization" },
      { key: "username", label: "Username", autocomplete: "username" },
    ],
  },
  {
    title: "Contact information",
    fields: [
      { key: "email", label: "Email", autocomplete: "email", inputmode: "email" },
      { key: "phone", label: "Phone", autocomplete: "tel", inputmode: "tel" },
    ],
  },
  {
    title: "Address",
    fields: [
      { key: "address1", label: "Address line 1", autocomplete: "address-line1" },
      { key: "address2", label: "Address line 2", autocomplete: "address-line2" },
      { key: "address3", label: "Address line 3", autocomplete: "address-line3" },
      { key: "city", label: "City", autocomplete: "address-level2" },
      { key: "state", label: "State / Province", autocomplete: "address-level1" },
      { key: "postalCode", label: "Postal code", autocomplete: "postal-code" },
      { key: "country", label: "Country", autocomplete: "country-name" },
    ],
  },
  {
    title: "Identification",
    fields: [
      { key: "ssn", label: "Social security number" },
      { key: "passportNumber", label: "Passport number" },
      { key: "licenseNumber", label: "License number" },
    ],
  },
]

export interface ExtensionFullWindowIdentityPaneProps {
  model: () => ExtensionFullWindowViewModel
  commands: ExtensionFullWindowCommands
  idPrefix?: string
}

export function ExtensionFullWindowIdentityPane(p: ExtensionFullWindowIdentityPaneProps): JSX.Element {
  const state = extensionFullWindowIdentityStateCreate(p.model, () => p.commands)
  return (
    <div class="flex flex-col gap-4 md:flex-row md:items-start">
      <section aria-label="Identities" class="flex min-w-0 flex-col gap-2 md:w-80 md:shrink-0">
        <div class="flex items-center justify-between gap-2">
          <h2 class="font-semibold">Identities</h2>
          <Button variant="filledBlue" size="sm" disabled={state.busy()} onClick={state.identityCreateOpen}>
            New identity
          </Button>
        </div>
        <InputS
          type="search"
          aria-label="Search identities"
          placeholder="Search identities"
          valueSignal={state.querySignal}
        />
        <Show when={state.errorMessage()}>
          {(message) => (
            <p role="alert" class="text-xs text-red-600 dark:text-red-400">
              {message()}
            </p>
          )}
        </Show>
        <Show when={state.loading()}>
          <div role="status" aria-label="Loading identities" class="flex justify-center py-8">
            <LoaderShuffle4Dots />
          </div>
        </Show>
        <Show when={!state.loading()}>
          <Show
            when={state.visibleIdentities().length > 0}
            fallback={
              <p class="py-6 text-center text-sm text-slate-600 dark:text-slate-300">
                {state.identitiesEmpty() ? "No identities yet." : "No identities match your search."}
              </p>
            }
          >
            <ul class="flex list-none flex-col gap-1">
              <For each={state.visibleIdentities()}>
                {(identity) => (
                  <li>
                    <Button
                      variant={state.selectedSummary()?.id === identity.id ? "filledBlue" : "ghost"}
                      class="w-full justify-start"
                      aria-current={state.selectedSummary()?.id === identity.id ? "true" : undefined}
                      onClick={() => state.identitySelect(identity)}
                    >
                      {identity.name}
                    </Button>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </Show>
      </section>

      <section aria-label="Identity details" class="min-w-0 grow">
        <Show when={state.formOpen()}>
          <CardWrapper>
            <form
              aria-label={state.creating() ? "Create identity" : "Edit identity"}
              class="flex flex-col gap-4"
              novalidate
              onSubmit={state.formSubmit}
            >
              <h2 class="text-lg font-semibold">{state.creating() ? "New identity" : "Edit identity"}</h2>
              <div>
                <Label for={`${p.idPrefix ?? ""}identity-name`}>Name</Label>
                <InputS id={`${p.idPrefix ?? ""}identity-name`} required autofocus valueSignal={state.nameSignal} />
              </div>
              <For each={identityFormSections}>
                {(section) => (
                  <fieldset class="grid gap-3 rounded-lg border border-slate-300 p-3 sm:grid-cols-2 dark:border-slate-700">
                    <legend class="px-1 font-medium">{section.title}</legend>
                    <For each={section.fields}>
                      {(field) => (
                        <div>
                          <Label for={`${p.idPrefix ?? ""}identity-${field.key}`}>{field.label}</Label>
                          <InputS
                            id={`${p.idPrefix ?? ""}identity-${field.key}`}
                            autocomplete={field.autocomplete}
                            inputmode={field.inputmode}
                            valueSignal={state.fieldSignal(field.key)}
                          />
                        </div>
                      )}
                    </For>
                  </fieldset>
                )}
              </For>
              <div>
                <Label for={`${p.idPrefix ?? ""}identity-notes`}>Notes</Label>
                <TextareaS id={`${p.idPrefix ?? ""}identity-notes`} rows={4} valueSignal={state.notesSignal} />
              </div>
              <Show when={state.validation()}>
                {(message) => (
                  <p role="alert" class="text-sm text-red-600 dark:text-red-400">
                    {message()}
                  </p>
                )}
              </Show>
              <div class="flex gap-2">
                <Button type="submit" variant="filledBlue" disabled={state.busy()}>
                  {state.creating() ? "Save identity" : "Save changes"}
                </Button>
                <Button type="button" variant="outline" disabled={state.busy()} onClick={state.actionCancel}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardWrapper>
        </Show>
        <Show when={!state.formOpen() && state.detailLoading()}>
          <div role="status" aria-label="Loading identity details" class="flex justify-center py-8">
            <LoaderShuffle4Dots />
          </div>
        </Show>
        <Show when={!state.formOpen() && !state.detailLoading() && state.selectedDetail()}>
          {(cipher) => (
            <CardWrapper>
              <article aria-label={`Details of ${cipher().name}`} class="flex flex-col gap-4">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <h2 class="text-lg font-semibold">{cipher().name}</h2>
                  <Button variant="ghost" size="sm" onClick={state.identityClose}>
                    Close
                  </Button>
                </div>
                <For each={state.detailSections()}>
                  {(section) => (
                    <section aria-label={section.title} class="flex flex-col gap-2">
                      <h3 class="font-medium">{section.title}</h3>
                      <dl class="grid gap-3 sm:grid-cols-2">
                        <For each={section.fields}>
                          {(field) => (
                            <div>
                              <dt class="text-xs font-medium text-slate-600 dark:text-slate-300">{field.label}</dt>
                              <dd class="break-words" aria-live={field.sensitive ? "polite" : undefined}>
                                {state.fieldValue(field)}
                              </dd>
                              <div class="flex gap-1">
                                <Show when={field.sensitive}>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={!state.canViewSensitive()}
                                    aria-pressed={state.fieldIsRevealed(field.key)}
                                    onClick={() => state.fieldRevealToggle(field.key)}
                                  >
                                    {state.fieldIsRevealed(field.key) ? `Hide ${field.label}` : `Reveal ${field.label}`}
                                  </Button>
                                </Show>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={field.sensitive && !state.canViewSensitive()}
                                  onClick={() => state.fieldCopy(field.key, field.value)}
                                >
                                  {state.fieldIsCopied(field.key) ? "Copied" : `Copy ${field.label}`}
                                </Button>
                              </div>
                            </div>
                          )}
                        </For>
                      </dl>
                    </section>
                  )}
                </For>
                <Show when={cipher().notes}>{(notes) => <p class="whitespace-pre-wrap text-sm">{notes()}</p>}</Show>
                <Show when={!state.canEdit()}>
                  <p role="status" class="text-sm text-slate-600 dark:text-slate-300">
                    You have view-only access to this item.
                  </p>
                </Show>
                <ExtensionFullWindowAssignmentPanel
                  model={p.model}
                  commands={p.commands}
                  source={() => ({
                    ...cipher(),
                    edit: state.selectedSummary()?.edit,
                    viewPassword: state.selectedSummary()?.viewPassword,
                  })}
                  idPrefix={p.idPrefix}
                />
                <ExtensionFullWindowCipherExtras
                  cipher={() => cipher()}
                  model={p.model}
                  commands={p.commands}
                  idPrefix={`${p.idPrefix ?? ""}identity-`}
                />
                <Show
                  when={state.deleting()}
                  fallback={
                    <div class="flex flex-wrap gap-2">
                      <Button
                        variant="filledBlue"
                        size="sm"
                        disabled={!p.model().fillAvailable || state.busy()}
                        onClick={() => p.commands.cipherFill?.(cipher().id, 4)}
                      >
                        Fill
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!state.canEdit() || state.busy()}
                        onClick={state.identityEditOpen}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!state.canDelete() || state.busy()}
                        onClick={state.identityDeleteOpen}
                      >
                        Delete
                      </Button>
                    </div>
                  }
                >
                  <div
                    role="alertdialog"
                    aria-labelledby={`${p.idPrefix ?? ""}delete-identity-title`}
                    class="flex flex-col gap-2 rounded-lg border border-red-300 p-3"
                  >
                    <h3 id={`${p.idPrefix ?? ""}delete-identity-title`} class="font-semibold">
                      Move this identity to trash?
                    </h3>
                    <p class="text-sm">You can restore it later from a compatible vault client.</p>
                    <div class="flex gap-2">
                      <Button variant="filledBlue" disabled={state.busy()} onClick={state.identityDeleteConfirm}>
                        Move to trash
                      </Button>
                      <Button variant="outline" disabled={state.busy()} onClick={state.actionCancel}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </Show>
              </article>
            </CardWrapper>
          )}
        </Show>
        <Show when={!state.formOpen() && !state.detailLoading() && !state.selectedDetail()}>
          <p class="py-6 text-sm text-slate-600 dark:text-slate-300">Select an identity to see its details.</p>
        </Show>
      </section>
    </div>
  )
}
