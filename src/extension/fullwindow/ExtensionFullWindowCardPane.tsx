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
import { extensionFullWindowCardStateCreate } from "./extensionFullWindowCardStateCreate.js"

export interface ExtensionFullWindowCardPaneProps {
  model: () => ExtensionFullWindowViewModel
  commands: ExtensionFullWindowCommands
  idPrefix?: string
}

export function ExtensionFullWindowCardPane(p: ExtensionFullWindowCardPaneProps): JSX.Element {
  const state = extensionFullWindowCardStateCreate(p.model, () => p.commands)
  return (
    <div class="flex flex-col gap-4 md:flex-row md:items-start">
      <section aria-label="Cards" class="flex min-w-0 flex-col gap-2 md:w-80 md:shrink-0">
        <div class="flex items-center justify-between gap-2">
          <h2 class="font-semibold">Cards</h2>
          <Button variant="filledBlue" size="sm" disabled={state.busy()} onClick={state.cardCreateOpen}>
            New card
          </Button>
        </div>
        <InputS type="search" aria-label="Search cards" placeholder="Search cards" valueSignal={state.querySignal} />
        <Show when={state.errorMessage()}>
          {(message) => (
            <p role="alert" class="text-xs text-red-600 dark:text-red-400">
              {message()}
            </p>
          )}
        </Show>
        <Show when={state.loading()}>
          <div role="status" aria-label="Loading cards" class="flex justify-center py-8">
            <LoaderShuffle4Dots />
          </div>
        </Show>
        <Show when={!state.loading()}>
          <Show
            when={state.visibleCards().length > 0}
            fallback={
              <p class="py-6 text-center text-sm text-slate-600 dark:text-slate-300">
                {state.cardsEmpty() ? "No cards yet." : "No cards match your search."}
              </p>
            }
          >
            <ul class="flex list-none flex-col gap-1">
              <For each={state.visibleCards()}>
                {(card) => (
                  <li>
                    <Button
                      variant={state.selectedSummary()?.id === card.id ? "filledBlue" : "ghost"}
                      class="w-full justify-start"
                      aria-current={state.selectedSummary()?.id === card.id ? "true" : undefined}
                      onClick={() => state.cardSelect(card)}
                    >
                      {card.name}
                    </Button>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </Show>
      </section>

      <section aria-label="Card details" class="min-w-0 grow">
        <Show when={state.formOpen()}>
          <CardWrapper>
            <form
              aria-label={state.creating() ? "Create card" : "Edit card"}
              class="flex flex-col gap-4"
              novalidate
              onSubmit={state.formSubmit}
            >
              <h2 class="text-lg font-semibold">{state.creating() ? "New card" : "Edit card"}</h2>
              <div>
                <Label for={`${p.idPrefix ?? ""}card-name`}>Name</Label>
                <InputS id={`${p.idPrefix ?? ""}card-name`} required autofocus valueSignal={state.nameSignal} />
              </div>
              <fieldset class="grid gap-3 rounded-lg border border-slate-300 p-3 sm:grid-cols-2 dark:border-slate-700">
                <legend class="px-1 font-medium">Card information</legend>
                <div>
                  <Label for={`${p.idPrefix ?? ""}card-holder`}>Cardholder name</Label>
                  <InputS
                    id={`${p.idPrefix ?? ""}card-holder`}
                    autocomplete="cc-name"
                    valueSignal={state.cardholderNameSignal}
                  />
                </div>
                <div>
                  <Label for={`${p.idPrefix ?? ""}card-brand`}>Brand</Label>
                  <InputS id={`${p.idPrefix ?? ""}card-brand`} placeholder="Visa" valueSignal={state.brandSignal} />
                </div>
                <div class="sm:col-span-2">
                  <Label for={`${p.idPrefix ?? ""}card-number`}>Card number</Label>
                  <InputS
                    id={`${p.idPrefix ?? ""}card-number`}
                    autocomplete="cc-number"
                    inputmode="numeric"
                    valueSignal={state.numberSignal}
                  />
                </div>
                <div>
                  <Label for={`${p.idPrefix ?? ""}card-month`}>Expiration month</Label>
                  <InputS
                    id={`${p.idPrefix ?? ""}card-month`}
                    autocomplete="cc-exp-month"
                    inputmode="numeric"
                    placeholder="MM"
                    valueSignal={state.expMonthSignal}
                  />
                </div>
                <div>
                  <Label for={`${p.idPrefix ?? ""}card-year`}>Expiration year</Label>
                  <InputS
                    id={`${p.idPrefix ?? ""}card-year`}
                    autocomplete="cc-exp-year"
                    inputmode="numeric"
                    placeholder="YYYY"
                    valueSignal={state.expYearSignal}
                  />
                </div>
                <div>
                  <Label for={`${p.idPrefix ?? ""}card-code`}>Security code</Label>
                  <InputS
                    id={`${p.idPrefix ?? ""}card-code`}
                    autocomplete="cc-csc"
                    inputmode="numeric"
                    valueSignal={state.codeSignal}
                  />
                </div>
              </fieldset>
              <div>
                <Label for={`${p.idPrefix ?? ""}card-notes`}>Notes</Label>
                <TextareaS id={`${p.idPrefix ?? ""}card-notes`} rows={4} valueSignal={state.notesSignal} />
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
                  {state.creating() ? "Save card" : "Save changes"}
                </Button>
                <Button type="button" variant="outline" disabled={state.busy()} onClick={state.actionCancel}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardWrapper>
        </Show>
        <Show when={!state.formOpen() && state.detailLoading()}>
          <div role="status" aria-label="Loading card details" class="flex justify-center py-8">
            <LoaderShuffle4Dots />
          </div>
        </Show>
        <Show when={!state.formOpen() && !state.detailLoading() && state.selectedDetail()}>
          {(cipher) => (
            <CardWrapper>
              <article aria-label={`Details of ${cipher().name}`} class="flex flex-col gap-4">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 class="text-lg font-semibold">{cipher().name}</h2>
                    <Show when={cipher().card.brand}>
                      <p class="text-sm text-slate-600 dark:text-slate-300">{cipher().card.brand}</p>
                    </Show>
                  </div>
                  <Button variant="ghost" size="sm" onClick={state.cardClose}>
                    Close
                  </Button>
                </div>
                <dl class="grid gap-3 sm:grid-cols-2">
                  <Show when={cipher().card.cardholderName}>
                    {(value) => (
                      <div>
                        <dt class="text-xs font-medium text-slate-600 dark:text-slate-300">Cardholder</dt>
                        <dd class="break-words">{value()}</dd>
                        <Button variant="ghost" size="sm" onClick={() => state.fieldCopy("cardholderName", value())}>
                          {state.fieldIsCopied("cardholderName") ? "Copied" : "Copy cardholder"}
                        </Button>
                      </div>
                    )}
                  </Show>
                  <Show when={cipher().card.number}>
                    {(value) => (
                      <div>
                        <dt class="text-xs font-medium text-slate-600 dark:text-slate-300">Card number</dt>
                        <dd class="break-all font-mono" aria-live="polite">
                          {state.sensitiveValue("number", value())}
                        </dd>
                        <div class="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={!state.canViewSensitive()}
                            aria-pressed={state.fieldIsRevealed("number")}
                            onClick={() => state.fieldRevealToggle("number")}
                          >
                            {state.fieldIsRevealed("number") ? "Hide number" : "Reveal number"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={!state.canViewSensitive()}
                            onClick={() => state.fieldCopy("number", value())}
                          >
                            {state.fieldIsCopied("number") ? "Copied" : "Copy number"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </Show>
                  <Show when={state.expiration()}>
                    {(value) => (
                      <div>
                        <dt class="text-xs font-medium text-slate-600 dark:text-slate-300">Expiration</dt>
                        <dd>{value()}</dd>
                        <Button variant="ghost" size="sm" onClick={() => state.fieldCopy("expiration", value())}>
                          {state.fieldIsCopied("expiration") ? "Copied" : "Copy expiration"}
                        </Button>
                      </div>
                    )}
                  </Show>
                  <Show when={cipher().card.code}>
                    {(value) => (
                      <div>
                        <dt class="text-xs font-medium text-slate-600 dark:text-slate-300">Security code</dt>
                        <dd class="font-mono" aria-live="polite">
                          {state.sensitiveValue("code", value())}
                        </dd>
                        <div class="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={!state.canViewSensitive()}
                            aria-pressed={state.fieldIsRevealed("code")}
                            onClick={() => state.fieldRevealToggle("code")}
                          >
                            {state.fieldIsRevealed("code") ? "Hide code" : "Reveal code"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={!state.canViewSensitive()}
                            onClick={() => state.fieldCopy("code", value())}
                          >
                            {state.fieldIsCopied("code") ? "Copied" : "Copy code"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </Show>
                </dl>
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
                  idPrefix={`${p.idPrefix ?? ""}card-`}
                />
                <Show
                  when={state.deleting()}
                  fallback={
                    <div class="flex flex-wrap gap-2">
                      <Button
                        variant="filledBlue"
                        size="sm"
                        disabled={!p.model().fillAvailable || state.busy()}
                        onClick={() => p.commands.cipherFill?.(cipher().id, 3)}
                      >
                        Fill
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!state.canEdit() || state.busy()}
                        onClick={state.cardEditOpen}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!state.canDelete() || state.busy()}
                        onClick={state.cardDeleteOpen}
                      >
                        Delete
                      </Button>
                    </div>
                  }
                >
                  <div
                    role="alertdialog"
                    aria-labelledby={`${p.idPrefix ?? ""}delete-card-title`}
                    class="flex flex-col gap-2 rounded-lg border border-red-300 p-3"
                  >
                    <h3 id={`${p.idPrefix ?? ""}delete-card-title`} class="font-semibold">
                      Move this card to trash?
                    </h3>
                    <p class="text-sm">You can restore it later from a compatible vault client.</p>
                    <div class="flex gap-2">
                      <Button variant="filledBlue" disabled={state.busy()} onClick={state.cardDeleteConfirm}>
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
          <p class="py-6 text-sm text-slate-600 dark:text-slate-300">Select a card to see its details.</p>
        </Show>
      </section>
    </div>
  )
}
