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
import { extensionFullWindowSshKeyStateCreate } from "./extensionFullWindowSshKeyStateCreate.js"

export interface ExtensionFullWindowSshKeyPaneProps {
  model: () => ExtensionFullWindowViewModel
  commands: ExtensionFullWindowCommands
  idPrefix?: string
}

export function ExtensionFullWindowSshKeyPane(p: ExtensionFullWindowSshKeyPaneProps): JSX.Element {
  const state = extensionFullWindowSshKeyStateCreate(p.model, () => p.commands)
  return (
    <div class="flex flex-col gap-4 md:flex-row md:items-start">
      <section aria-label="SSH keys" class="flex min-w-0 flex-col gap-2 md:w-80 md:shrink-0">
        <div class="flex items-center justify-between gap-2">
          <h2 class="font-semibold">SSH keys</h2>
          <Button variant="filledBlue" size="sm" disabled={state.busy()} onClick={state.sshKeyCreateOpen}>
            New SSH key
          </Button>
        </div>
        <InputS
          type="search"
          aria-label="Search SSH keys"
          placeholder="Search SSH keys"
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
          <div role="status" aria-label="Loading SSH keys" class="flex justify-center py-8">
            <LoaderShuffle4Dots />
          </div>
        </Show>
        <Show when={!state.loading()}>
          <Show
            when={state.visibleSshKeys().length > 0}
            fallback={
              <p class="py-6 text-center text-sm text-slate-600 dark:text-slate-300">
                {state.sshKeysEmpty() ? "No SSH keys yet." : "No SSH keys match your search."}
              </p>
            }
          >
            <ul class="flex list-none flex-col gap-1">
              <For each={state.visibleSshKeys()}>
                {(key) => (
                  <li>
                    <Button
                      variant={state.selectedSummary()?.id === key.id ? "filledBlue" : "ghost"}
                      class="w-full justify-start"
                      aria-current={state.selectedSummary()?.id === key.id ? "true" : undefined}
                      onClick={() => state.sshKeySelect(key)}
                    >
                      {key.name}
                    </Button>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </Show>
      </section>
      <section aria-label="SSH key details" class="min-w-0 grow">
        <Show when={state.formOpen()}>
          <CardWrapper>
            <form
              aria-label={state.creating() ? "Create SSH key" : "Edit SSH key"}
              class="flex flex-col gap-4"
              novalidate
              onSubmit={state.formSubmit}
            >
              <h2 class="text-lg font-semibold">{state.creating() ? "New SSH key" : "Edit SSH key"}</h2>
              <div>
                <Label for={`${p.idPrefix ?? ""}ssh-name`}>Name</Label>
                <InputS id={`${p.idPrefix ?? ""}ssh-name`} required autofocus valueSignal={state.nameSignal} />
              </div>
              <div>
                <Label for={`${p.idPrefix ?? ""}ssh-private`}>Private key</Label>
                <TextareaS
                  id={`${p.idPrefix ?? ""}ssh-private`}
                  required
                  rows={8}
                  autocomplete="off"
                  spellcheck={false}
                  valueSignal={state.privateKeySignal}
                />
              </div>
              <div>
                <Label for={`${p.idPrefix ?? ""}ssh-public`}>Public key</Label>
                <TextareaS
                  id={`${p.idPrefix ?? ""}ssh-public`}
                  required
                  rows={3}
                  autocomplete="off"
                  spellcheck={false}
                  valueSignal={state.publicKeySignal}
                />
              </div>
              <div>
                <Label for={`${p.idPrefix ?? ""}ssh-fingerprint`}>Fingerprint</Label>
                <InputS
                  id={`${p.idPrefix ?? ""}ssh-fingerprint`}
                  required
                  autocomplete="off"
                  spellcheck={false}
                  valueSignal={state.fingerprintSignal}
                />
              </div>
              <div>
                <Label for={`${p.idPrefix ?? ""}ssh-notes`}>Notes</Label>
                <TextareaS id={`${p.idPrefix ?? ""}ssh-notes`} rows={4} valueSignal={state.notesSignal} />
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
                  {state.creating() ? "Save SSH key" : "Save changes"}
                </Button>
                <Button type="button" variant="outline" disabled={state.busy()} onClick={state.actionCancel}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardWrapper>
        </Show>
        <Show when={!state.formOpen() && state.detailLoading()}>
          <div role="status" aria-label="Loading SSH key details" class="flex justify-center py-8">
            <LoaderShuffle4Dots />
          </div>
        </Show>
        <Show when={!state.formOpen() && !state.detailLoading() && state.selectedDetail()}>
          {(cipher) => (
            <CardWrapper>
              <article aria-label={`Details of ${cipher().name}`} class="flex flex-col gap-4">
                <div class="flex items-center justify-between gap-2">
                  <h2 class="text-lg font-semibold">{cipher().name}</h2>
                  <Button variant="ghost" size="sm" onClick={state.sshKeyClose}>
                    Close
                  </Button>
                </div>
                <dl class="grid gap-4">
                  <Show when={cipher().sshKey.keyFingerprint}>
                    {(value) => (
                      <div>
                        <dt class="text-xs font-medium text-slate-600 dark:text-slate-300">Fingerprint</dt>
                        <dd class="break-all font-mono">{value()}</dd>
                        <Button variant="ghost" size="sm" onClick={() => state.fieldCopy("keyFingerprint", value())}>
                          {state.fieldIsCopied("keyFingerprint") ? "Copied" : "Copy fingerprint"}
                        </Button>
                      </div>
                    )}
                  </Show>
                  <Show when={cipher().sshKey.publicKey}>
                    {(value) => (
                      <div>
                        <dt class="text-xs font-medium text-slate-600 dark:text-slate-300">Public key</dt>
                        <dd class="whitespace-pre-wrap break-all font-mono text-sm">{value()}</dd>
                        <Button variant="ghost" size="sm" onClick={() => state.fieldCopy("publicKey", value())}>
                          {state.fieldIsCopied("publicKey") ? "Copied" : "Copy public key"}
                        </Button>
                      </div>
                    )}
                  </Show>
                  <Show when={cipher().sshKey.privateKey}>
                    {(value) => (
                      <div>
                        <dt class="text-xs font-medium text-slate-600 dark:text-slate-300">Private key</dt>
                        <dd class="whitespace-pre-wrap break-all font-mono text-sm" aria-live="polite">
                          {state.privateKeyValue(value())}
                        </dd>
                        <div class="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={!state.canViewSensitive()}
                            aria-pressed={state.privateKeyIsRevealed()}
                            onClick={state.privateKeyRevealToggle}
                          >
                            {state.privateKeyIsRevealed() ? "Hide private key" : "Reveal private key"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={!state.canViewSensitive()}
                            onClick={() => state.fieldCopy("privateKey", value())}
                          >
                            {state.fieldIsCopied("privateKey") ? "Copied" : "Copy private key"}
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
                  idPrefix={`${p.idPrefix ?? ""}ssh-key-`}
                />
                <Show
                  when={state.deleting()}
                  fallback={
                    <div class="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!state.canEdit() || state.busy()}
                        onClick={state.sshKeyEditOpen}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!state.canDelete() || state.busy()}
                        onClick={state.sshKeyDeleteOpen}
                      >
                        Delete
                      </Button>
                    </div>
                  }
                >
                  <div
                    role="alertdialog"
                    aria-labelledby={`${p.idPrefix ?? ""}delete-ssh-title`}
                    class="flex flex-col gap-2 rounded-lg border border-red-300 p-3"
                  >
                    <h3 id={`${p.idPrefix ?? ""}delete-ssh-title`} class="font-semibold">
                      Move this SSH key to trash?
                    </h3>
                    <p class="text-sm">You can restore it later from a compatible vault client.</p>
                    <div class="flex gap-2">
                      <Button variant="filledBlue" disabled={state.busy()} onClick={state.sshKeyDeleteConfirm}>
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
          <p class="py-6 text-sm text-slate-600 dark:text-slate-300">Select an SSH key to see its details.</p>
        </Show>
      </section>
    </div>
  )
}
