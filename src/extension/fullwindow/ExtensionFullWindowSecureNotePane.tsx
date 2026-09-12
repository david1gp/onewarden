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
import { extensionFullWindowSecureNoteStateCreate } from "./extensionFullWindowSecureNoteStateCreate.js"

export interface ExtensionFullWindowSecureNotePaneProps {
  model: () => ExtensionFullWindowViewModel
  commands: ExtensionFullWindowCommands
  idPrefix?: string
  initialState?: ExtensionFullWindowInitialState
}

export function ExtensionFullWindowSecureNotePane(p: ExtensionFullWindowSecureNotePaneProps): JSX.Element {
  const state = extensionFullWindowSecureNoteStateCreate(p.model, () => p.commands, p.initialState)
  return (
    <div class="flex flex-col gap-4 md:flex-row md:items-start">
      <section aria-label="Secure notes" class="flex min-w-0 flex-col gap-2 md:w-80 md:shrink-0">
        <div class="flex items-center justify-between gap-2">
          <h2 class="font-semibold">Secure notes</h2>
          <Button
            variant="filledBlue"
            size="sm"
            class="extension-primary-control"
            disabled={state.busy()}
            onClick={state.noteCreateOpen}
          >
            New note
          </Button>
        </div>
        <ExtensionInputS
          type="search"
          aria-label="Search secure notes"
          placeholder="Search secure notes"
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
          <div role="status" aria-label="Loading secure notes" class="flex justify-center py-8">
            <LoaderShuffle4Dots />
          </div>
        </Show>
        <Show when={!state.loading()}>
          <Show
            when={state.visibleNotes().length > 0}
            fallback={
              <p class="extension-muted-text py-6 text-center text-sm">
                {state.notesEmpty() ? "No secure notes yet." : "No secure notes match your search."}
              </p>
            }
          >
            <ul class="flex list-none flex-col gap-1">
              <For each={state.visibleNotes()}>
                {(note) => (
                  <li>
                    <Button
                      variant="ghost"
                      class="extension-selected-control w-full justify-start"
                      aria-current={state.selectedSummary()?.id === note.id ? "true" : undefined}
                      onClick={() => state.noteSelect(note)}
                    >
                      {note.name}
                    </Button>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </Show>
      </section>

      <section aria-label="Secure note details" class="min-w-0 grow">
        <Show when={state.formOpen()}>
          <ExtensionCardWrapper>
            <form
              aria-label={state.creating() ? "Create secure note" : "Edit secure note"}
              class="flex flex-col gap-3"
              novalidate
              onSubmit={state.formSubmit}
            >
              <h2 class="text-lg font-semibold">{state.creating() ? "New secure note" : "Edit secure note"}</h2>
              <div>
                <Label for={`${p.idPrefix ?? ""}secure-note-name`}>Name</Label>
                <ExtensionInputS
                  id={`${p.idPrefix ?? ""}secure-note-name`}
                  required
                  autofocus
                  disabled={state.busy()}
                  valueSignal={state.nameSignal}
                />
              </div>
              <div>
                <Label for={`${p.idPrefix ?? ""}secure-note-text`}>Note</Label>
                <ExtensionTextareaS
                  id={`${p.idPrefix ?? ""}secure-note-text`}
                  rows={10}
                  disabled={state.busy()}
                  valueSignal={state.noteSignal}
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
                  {state.creating() ? "Save note" : "Save changes"}
                </Button>
                <Button type="button" variant="outline" disabled={state.busy()} onClick={state.actionCancel}>
                  Cancel
                </Button>
              </div>
            </form>
          </ExtensionCardWrapper>
        </Show>
        <Show when={!state.formOpen() && state.detailLoading()}>
          <div role="status" aria-label="Loading secure note details" class="flex justify-center py-8">
            <LoaderShuffle4Dots />
          </div>
        </Show>
        <Show when={!state.formOpen() && !state.detailLoading() && state.selectedDetail()}>
          {(note) => (
            <ExtensionCardWrapper>
              <article aria-label={`Details of ${note().name}`} class="flex flex-col gap-3">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <h2 class="text-lg font-semibold">{note().name}</h2>
                  <Button variant="ghost" size="sm" onClick={state.noteClose}>
                    Close
                  </Button>
                </div>
                <p class="whitespace-pre-wrap text-sm">{note().notes || "This secure note is empty."}</p>
                <Show when={!state.canEdit()}>
                  <p role="status" class="extension-muted-text text-sm">
                    You have view-only access to this item.
                  </p>
                </Show>
                <ExtensionFullWindowAssignmentPanel
                  model={p.model}
                  commands={p.commands}
                  source={() => ({
                    ...note(),
                    edit: state.selectedSummary()?.edit,
                    viewPassword: state.selectedSummary()?.viewPassword,
                  })}
                  idPrefix={p.idPrefix}
                />
                <ExtensionFullWindowCipherExtras
                  cipher={() => note()}
                  model={p.model}
                  commands={p.commands}
                  idPrefix={`${p.idPrefix ?? ""}secure-note-`}
                  initialState={p.initialState}
                />
                <Show
                  when={state.deleting()}
                  fallback={
                    <div class="flex flex-wrap gap-2">
                      <Show when={note().notes}>
                        <Button variant="outline" size="sm" onClick={state.noteCopy}>
                          Copy note
                        </Button>
                      </Show>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!state.canEdit() || state.busy()}
                        onClick={state.noteEditOpen}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!state.canDelete() || state.busy()}
                        onClick={state.noteDeleteOpen}
                      >
                        Delete
                      </Button>
                    </div>
                  }
                >
                  <div
                    role="alertdialog"
                    aria-labelledby={`${p.idPrefix ?? ""}delete-note-title`}
                    class="extension-destructive-surface flex flex-col gap-2 rounded-lg p-3"
                  >
                    <h3 id={`${p.idPrefix ?? ""}delete-note-title`} class="font-semibold">
                      Move this secure note to trash?
                    </h3>
                    <p class="text-sm">You can restore it later from a compatible vault client.</p>
                    <div class="flex gap-2">
                      <Button
                        variant="filledBlue"
                        class="extension-destructive-control"
                        disabled={state.busy()}
                        onClick={state.noteDeleteConfirm}
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
          <p class="extension-muted-text py-6 text-sm">Select a secure note to see its details.</p>
        </Show>
      </section>
    </div>
  )
}
