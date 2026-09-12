import { For, type JSX, Show } from "solid-js"
import { Label } from "#ui/input/label/Label.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { LoaderShuffle4Dots } from "#ui/static/loaders/LoaderShuffle4Dots.jsx"
import { ExtensionCardWrapper } from "../ui/ExtensionCardWrapper.jsx"
import { ExtensionInputS } from "../ui/ExtensionInputS.jsx"
import { ExtensionTextareaS } from "../ui/ExtensionTextareaS.jsx"
import { ExtensionFullWindowAssignmentPanel } from "./ExtensionFullWindowAssignmentPanel.jsx"
import { ExtensionFullWindowCipherExtras } from "./ExtensionFullWindowCipherExtras.jsx"
import type { ExtensionFullWindowCommands } from "./ExtensionFullWindowCommands.js"
import type { ExtensionFullWindowInitialState } from "./ExtensionFullWindowInitialState.js"
import type { ExtensionFullWindowViewModel } from "./ExtensionFullWindowViewModel.js"
import { extensionFullWindowCardStateCreate } from "./extensionFullWindowCardStateCreate.js"

export interface ExtensionFullWindowCardPaneProps {
  model: () => ExtensionFullWindowViewModel
  commands: ExtensionFullWindowCommands
  idPrefix?: string
  initialState?: ExtensionFullWindowInitialState
}

export function ExtensionFullWindowCardPane(p: ExtensionFullWindowCardPaneProps): JSX.Element {
  const state = extensionFullWindowCardStateCreate(p.model, () => p.commands, p.initialState)
  return (
    <div class="flex flex-col gap-4 md:flex-row md:items-start">
      <section aria-label="Cards" class="flex min-w-0 flex-col gap-2 md:w-80 md:shrink-0">
        <div class="flex items-center justify-between gap-2">
          <h2 class="font-semibold">Cards</h2>
          <Button
            variant="filledBlue"
            size="sm"
            class="extension-primary-control"
            disabled={state.busy()}
            onClick={state.cardCreateOpen}
          >
            New card
          </Button>
        </div>
        <ExtensionInputS
          type="search"
          aria-label="Search cards"
          placeholder="Search cards"
          disabled={state.busy()}
          valueSignal={state.querySignal}
        />
        <Show when={state.errorMessage()}>
          {(message) => (
            <p role="alert" class="extension-error-text text-xs">
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
              <p class="extension-muted-text py-6 text-center text-sm">
                {state.cardsEmpty() ? "No cards yet." : "No cards match your search."}
              </p>
            }
          >
            <ul class="flex list-none flex-col gap-1">
              <For each={state.visibleCards()}>
                {(card) => (
                  <li>
                    <Button
                      variant="ghost"
                      class="extension-selected-control w-full justify-start"
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
          <ExtensionCardWrapper>
            <form
              aria-label={state.creating() ? "Create card" : "Edit card"}
              class="flex flex-col gap-4"
              novalidate
              onSubmit={state.formSubmit}
            >
              <h2 class="text-lg font-semibold">{state.creating() ? "New card" : "Edit card"}</h2>
              <div>
                <Label for={`${p.idPrefix ?? ""}card-name`}>Name</Label>
                <ExtensionInputS
                  id={`${p.idPrefix ?? ""}card-name`}
                  required
                  autofocus
                  disabled={state.busy()}
                  valueSignal={state.nameSignal}
                />
              </div>
              <fieldset class="extension-boundary grid gap-3 rounded-lg border p-3 sm:grid-cols-2">
                <legend class="px-1 font-medium">Card information</legend>
                <div>
                  <Label for={`${p.idPrefix ?? ""}card-holder`}>Cardholder name</Label>
                  <ExtensionInputS
                    id={`${p.idPrefix ?? ""}card-holder`}
                    autocomplete="cc-name"
                    disabled={state.busy()}
                    valueSignal={state.cardholderNameSignal}
                  />
                </div>
                <div>
                  <Label for={`${p.idPrefix ?? ""}card-brand`}>Brand</Label>
                  <ExtensionInputS
                    id={`${p.idPrefix ?? ""}card-brand`}
                    placeholder="Visa"
                    disabled={state.busy()}
                    valueSignal={state.brandSignal}
                  />
                </div>
                <div class="sm:col-span-2">
                  <Label for={`${p.idPrefix ?? ""}card-number`}>Card number</Label>
                  <ExtensionInputS
                    id={`${p.idPrefix ?? ""}card-number`}
                    autocomplete="cc-number"
                    inputmode="numeric"
                    disabled={state.busy()}
                    valueSignal={state.numberSignal}
                  />
                </div>
                <div>
                  <Label for={`${p.idPrefix ?? ""}card-month`}>Expiration month</Label>
                  <ExtensionInputS
                    id={`${p.idPrefix ?? ""}card-month`}
                    autocomplete="cc-exp-month"
                    inputmode="numeric"
                    placeholder="MM"
                    disabled={state.busy()}
                    valueSignal={state.expMonthSignal}
                  />
                </div>
                <div>
                  <Label for={`${p.idPrefix ?? ""}card-year`}>Expiration year</Label>
                  <ExtensionInputS
                    id={`${p.idPrefix ?? ""}card-year`}
                    autocomplete="cc-exp-year"
                    inputmode="numeric"
                    placeholder="YYYY"
                    disabled={state.busy()}
                    valueSignal={state.expYearSignal}
                  />
                </div>
                <div>
                  <Label for={`${p.idPrefix ?? ""}card-code`}>Security code</Label>
                  <ExtensionInputS
                    id={`${p.idPrefix ?? ""}card-code`}
                    autocomplete="cc-csc"
                    inputmode="numeric"
                    disabled={state.busy()}
                    valueSignal={state.codeSignal}
                  />
                </div>
              </fieldset>
              <div>
                <Label for={`${p.idPrefix ?? ""}card-notes`}>Notes</Label>
                <ExtensionTextareaS
                  id={`${p.idPrefix ?? ""}card-notes`}
                  rows={4}
                  disabled={state.busy()}
                  valueSignal={state.notesSignal}
                />
              </div>
              <Show when={state.validation()}>
                {(message) => (
                  <p role="alert" class="extension-error-text text-sm">
                    {message()}
                  </p>
                )}
              </Show>
              <div class="flex gap-2">
                <Button type="submit" variant="filledBlue" class="extension-primary-control" disabled={state.busy()}>
                  {state.creating() ? "Save card" : "Save changes"}
                </Button>
                <Button type="button" variant="outline" disabled={state.busy()} onClick={state.actionCancel}>
                  Cancel
                </Button>
              </div>
            </form>
          </ExtensionCardWrapper>
        </Show>
        <Show when={!state.formOpen() && state.detailLoading()}>
          <div role="status" aria-label="Loading card details" class="flex justify-center py-8">
            <LoaderShuffle4Dots />
          </div>
        </Show>
        <Show when={!state.formOpen() && !state.detailLoading() && state.selectedDetail()}>
          {(cipher) => (
            <ExtensionCardWrapper>
              <article aria-label={`Details of ${cipher().name}`} class="flex flex-col gap-4">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 class="text-lg font-semibold">{cipher().name}</h2>
                    <Show when={cipher().card.brand}>
                      <p class="extension-muted-text text-sm">{cipher().card.brand}</p>
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
                        <dt class="extension-muted-text text-xs font-medium">Cardholder</dt>
                        <dd>
                          <div class="break-words">{value()}</div>
                          <Button variant="ghost" size="sm" onClick={() => state.fieldCopy("cardholderName", value())}>
                            {state.fieldIsCopied("cardholderName") ? "Copied" : "Copy cardholder"}
                          </Button>
                        </dd>
                      </div>
                    )}
                  </Show>
                  <Show when={cipher().card.number}>
                    {(value) => (
                      <div>
                        <dt class="extension-muted-text text-xs font-medium">Card number</dt>
                        <dd>
                          <div class="break-all font-mono" aria-live="polite">
                            {state.sensitiveValue("number", value())}
                          </div>
                          <div class="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              class="extension-selected-control"
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
                        </dd>
                      </div>
                    )}
                  </Show>
                  <Show when={state.expiration()}>
                    {(value) => (
                      <div>
                        <dt class="extension-muted-text text-xs font-medium">Expiration</dt>
                        <dd>
                          <div>{value()}</div>
                          <Button variant="ghost" size="sm" onClick={() => state.fieldCopy("expiration", value())}>
                            {state.fieldIsCopied("expiration") ? "Copied" : "Copy expiration"}
                          </Button>
                        </dd>
                      </div>
                    )}
                  </Show>
                  <Show when={cipher().card.code}>
                    {(value) => (
                      <div>
                        <dt class="extension-muted-text text-xs font-medium">Security code</dt>
                        <dd>
                          <div class="font-mono" aria-live="polite">
                            {state.sensitiveValue("code", value())}
                          </div>
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
                        </dd>
                      </div>
                    )}
                  </Show>
                </dl>
                <Show when={cipher().notes}>{(notes) => <p class="whitespace-pre-wrap text-sm">{notes()}</p>}</Show>
                <Show when={!state.canEdit()}>
                  <p role="status" class="extension-muted-text text-sm">
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
                  initialState={p.initialState}
                />
                <Show
                  when={state.deleting()}
                  fallback={
                    <div class="flex flex-wrap gap-2">
                      <Button
                        variant="filledBlue"
                        size="sm"
                        class="extension-primary-control"
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
                    class="extension-destructive-surface flex flex-col gap-2 rounded-lg p-3"
                  >
                    <h3 id={`${p.idPrefix ?? ""}delete-card-title`} class="font-semibold">
                      Move this card to trash?
                    </h3>
                    <p class="text-sm">You can restore it later from a compatible vault client.</p>
                    <div class="flex gap-2">
                      <Button
                        variant="filledBlue"
                        class="extension-destructive-control"
                        disabled={state.busy()}
                        onClick={state.cardDeleteConfirm}
                      >
                        Move to trash
                      </Button>
                      <Button variant="outline" disabled={state.busy()} onClick={state.actionCancel}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </Show>
              </article>
            </ExtensionCardWrapper>
          )}
        </Show>
        <Show when={!state.formOpen() && !state.detailLoading() && !state.selectedDetail()}>
          <p class="extension-muted-text py-6 text-sm">Select a card to see its details.</p>
        </Show>
      </section>
    </div>
  )
}
