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
import { extensionFullWindowSecureNoteStateCreate } from "./extensionFullWindowSecureNoteStateCreate.js"

export interface ExtensionFullWindowSecureNotePaneProps {
  model: () => ExtensionFullWindowViewModel
  commands: ExtensionFullWindowCommands
  idPrefix?: string
}

export function ExtensionFullWindowSecureNotePane(p: ExtensionFullWindowSecureNotePaneProps): JSX.Element {
  const state = extensionFullWindowSecureNoteStateCreate(p.model, () => p.commands)
  return (
    <div class="flex flex-col gap-4 md:flex-row md:items-start">
      <section aria-label="Secure notes" class="flex min-w-0 flex-col gap-2 md:w-80 md:shrink-0">
        <div class="flex items-center justify-between gap-2">
          <h2 class="font-semibold">Secure notes</h2>
          <Button variant="filledBlue" size="sm" disabled={state.busy()} onClick={state.noteCreateOpen}>
            New note
          </Button>
        </div>
        <InputS
          type="search"
          aria-label="Search secure notes"
          placeholder="Search secure notes"
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
          <div role="status" aria-label="Loading secure notes" class="flex justify-center py-8">
            <LoaderShuffle4Dots />
          </div>
        </Show>
        <Show when={!state.loading()}>
          <Show
            when={state.visibleNotes().length > 0}
            fallback={
              <p class="py-6 text-center text-sm text-slate-600 dark:text-slate-300">
                {state.notesEmpty() ? "No secure notes yet." : "No secure notes match your search."}
              </p>
            }
          >
            <ul class="flex list-none flex-col gap-1">
              <For each={state.visibleNotes()}>
                {(note) => (
                  <li>
                    <Button
                      variant={state.selectedSummary()?.id === note.id ? "filledBlue" : "ghost"}
                      class="w-full justify-start"
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
          <CardWrapper>
            <form
              aria-label={state.creating() ? "Create secure note" : "Edit secure note"}
              class="flex flex-col gap-3"
              novalidate
              onSubmit={state.formSubmit}
            >
              <h2 class="text-lg font-semibold">{state.creating() ? "New secure note" : "Edit secure note"}</h2>
              <div>
                <Label for={`${p.idPrefix ?? ""}secure-note-name`}>Name</Label>
                <InputS id={`${p.idPrefix ?? ""}secure-note-name`} required autofocus valueSignal={state.nameSignal} />
              </div>
              <div>
                <Label for={`${p.idPrefix ?? ""}secure-note-text`}>Note</Label>
                <TextareaS id={`${p.idPrefix ?? ""}secure-note-text`} rows={10} valueSignal={state.noteSignal} />
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
                  {state.creating() ? "Save note" : "Save changes"}
                </Button>
                <Button type="button" variant="outline" disabled={state.busy()} onClick={state.actionCancel}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardWrapper>
        </Show>
        <Show when={!state.formOpen() && state.detailLoading()}>
          <div role="status" aria-label="Loading secure note details" class="flex justify-center py-8">
            <LoaderShuffle4Dots />
          </div>
        </Show>
        <Show when={!state.formOpen() && !state.detailLoading() && state.selectedDetail()}>
          {(note) => (
            <CardWrapper>
              <article aria-label={`Details of ${note().name}`} class="flex flex-col gap-3">
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <h2 class="text-lg font-semibold">{note().name}</h2>
                  <Button variant="ghost" size="sm" onClick={state.noteClose}>
                    Close
                  </Button>
                </div>
                <p class="whitespace-pre-wrap text-sm">{note().notes || "This secure note is empty."}</p>
                <Show when={!state.canEdit()}>
                  <p role="status" class="text-sm text-slate-600 dark:text-slate-300">
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
                    class="flex flex-col gap-2 rounded-lg border border-red-300 p-3"
                  >
                    <h3 id={`${p.idPrefix ?? ""}delete-note-title`} class="font-semibold">
                      Move this secure note to trash?
                    </h3>
                    <p class="text-sm">You can restore it later from a compatible vault client.</p>
                    <div class="flex gap-2">
                      <Button variant="filledBlue" disabled={state.busy()} onClick={state.noteDeleteConfirm}>
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
          <p class="py-6 text-sm text-slate-600 dark:text-slate-300">Select a secure note to see its details.</p>
        </Show>
      </section>
    </div>
  )
}
