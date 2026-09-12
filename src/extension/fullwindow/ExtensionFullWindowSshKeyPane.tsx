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
import { extensionFullWindowSshKeyStateCreate } from "./extensionFullWindowSshKeyStateCreate.js"

export interface ExtensionFullWindowSshKeyPaneProps {
  model: () => ExtensionFullWindowViewModel
  commands: ExtensionFullWindowCommands
  idPrefix?: string
  initialState?: ExtensionFullWindowInitialState
}

export function ExtensionFullWindowSshKeyPane(p: ExtensionFullWindowSshKeyPaneProps): JSX.Element {
  const state = extensionFullWindowSshKeyStateCreate(p.model, () => p.commands, p.initialState)
  return (
    <div class="flex flex-col gap-4 md:flex-row md:items-start">
      <section aria-label="SSH keys" class="flex min-w-0 flex-col gap-2 md:w-80 md:shrink-0">
        <div class="flex items-center justify-between gap-2">
          <h2 class="font-semibold">SSH keys</h2>
          <Button
            variant="filledBlue"
            size="sm"
            class="extension-primary-control"
            disabled={state.busy()}
            onClick={state.sshKeyCreateOpen}
          >
            New SSH key
          </Button>
        </div>
        <ExtensionInputS
          type="search"
          aria-label="Search SSH keys"
          placeholder="Search SSH keys"
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
          <div role="status" aria-label="Loading SSH keys" class="flex justify-center py-8">
            <LoaderShuffle4Dots />
          </div>
        </Show>
        <Show when={!state.loading()}>
          <Show
            when={state.visibleSshKeys().length > 0}
            fallback={
              <p class="extension-muted-text py-6 text-center text-sm">
                {state.sshKeysEmpty() ? "No SSH keys yet." : "No SSH keys match your search."}
              </p>
            }
          >
            <ul class="flex list-none flex-col gap-1">
              <For each={state.visibleSshKeys()}>
                {(key) => (
                  <li>
                    <Button
                      variant="ghost"
                      class="extension-selected-control w-full justify-start"
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
          <ExtensionCardWrapper>
            <form
              aria-label={state.creating() ? "Create SSH key" : "Edit SSH key"}
              class="flex flex-col gap-4"
              novalidate
              onSubmit={state.formSubmit}
            >
              <h2 class="text-lg font-semibold">{state.creating() ? "New SSH key" : "Edit SSH key"}</h2>
              <div>
                <Label for={`${p.idPrefix ?? ""}ssh-name`}>Name</Label>
                <ExtensionInputS
                  id={`${p.idPrefix ?? ""}ssh-name`}
                  required
                  autofocus
                  disabled={state.busy()}
                  valueSignal={state.nameSignal}
                />
              </div>
              <div>
                <Label for={`${p.idPrefix ?? ""}ssh-private`}>Private key</Label>
                <ExtensionTextareaS
                  id={`${p.idPrefix ?? ""}ssh-private`}
                  required
                  rows={8}
                  autocomplete="off"
                  spellcheck={false}
                  disabled={state.busy()}
                  valueSignal={state.privateKeySignal}
                />
              </div>
              <div>
                <Label for={`${p.idPrefix ?? ""}ssh-public`}>Public key</Label>
                <ExtensionTextareaS
                  id={`${p.idPrefix ?? ""}ssh-public`}
                  required
                  rows={3}
                  autocomplete="off"
                  spellcheck={false}
                  disabled={state.busy()}
                  valueSignal={state.publicKeySignal}
                />
              </div>
              <div>
                <Label for={`${p.idPrefix ?? ""}ssh-fingerprint`}>Fingerprint</Label>
                <ExtensionInputS
                  id={`${p.idPrefix ?? ""}ssh-fingerprint`}
                  required
                  autocomplete="off"
                  spellcheck={false}
                  disabled={state.busy()}
                  valueSignal={state.fingerprintSignal}
                />
              </div>
              <div>
                <Label for={`${p.idPrefix ?? ""}ssh-notes`}>Notes</Label>
                <ExtensionTextareaS
                  id={`${p.idPrefix ?? ""}ssh-notes`}
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
                  {state.creating() ? "Save SSH key" : "Save changes"}
                </Button>
                <Button type="button" variant="outline" disabled={state.busy()} onClick={state.actionCancel}>
                  Cancel
                </Button>
              </div>
            </form>
          </ExtensionCardWrapper>
        </Show>
        <Show when={!state.formOpen() && state.detailLoading()}>
          <div role="status" aria-label="Loading SSH key details" class="flex justify-center py-8">
            <LoaderShuffle4Dots />
          </div>
        </Show>
        <Show when={!state.formOpen() && !state.detailLoading() && state.selectedDetail()}>
          {(cipher) => (
            <ExtensionCardWrapper>
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
                        <dt class="extension-muted-text text-xs font-medium">Fingerprint</dt>
                        <dd>
                          <div class="break-all font-mono">{value()}</div>
                          <Button variant="ghost" size="sm" onClick={() => state.fieldCopy("keyFingerprint", value())}>
                            {state.fieldIsCopied("keyFingerprint") ? "Copied" : "Copy fingerprint"}
                          </Button>
                        </dd>
                      </div>
                    )}
                  </Show>
                  <Show when={cipher().sshKey.publicKey}>
                    {(value) => (
                      <div>
                        <dt class="extension-muted-text text-xs font-medium">Public key</dt>
                        <dd>
                          <div class="whitespace-pre-wrap break-all font-mono text-sm">{value()}</div>
                          <Button variant="ghost" size="sm" onClick={() => state.fieldCopy("publicKey", value())}>
                            {state.fieldIsCopied("publicKey") ? "Copied" : "Copy public key"}
                          </Button>
                        </dd>
                      </div>
                    )}
                  </Show>
                  <Show when={cipher().sshKey.privateKey}>
                    {(value) => (
                      <div>
                        <dt class="extension-muted-text text-xs font-medium">Private key</dt>
                        <dd>
                          <div class="whitespace-pre-wrap break-all font-mono text-sm" aria-live="polite">
                            {state.privateKeyValue(value())}
                          </div>
                          <div class="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              class="extension-selected-control"
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
                  idPrefix={`${p.idPrefix ?? ""}ssh-key-`}
                  initialState={p.initialState}
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
                    class="extension-destructive-surface flex flex-col gap-2 rounded-lg p-3"
                  >
                    <h3 id={`${p.idPrefix ?? ""}delete-ssh-title`} class="font-semibold">
                      Move this SSH key to trash?
                    </h3>
                    <p class="text-sm">You can restore it later from a compatible vault client.</p>
                    <div class="flex gap-2">
                      <Button
                        variant="filledBlue"
                        class="extension-destructive-control"
                        disabled={state.busy()}
                        onClick={state.sshKeyDeleteConfirm}
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
          <p class="extension-muted-text py-6 text-sm">Select an SSH key to see its details.</p>
        </Show>
      </section>
    </div>
  )
}
