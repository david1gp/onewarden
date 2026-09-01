import { For, type JSX, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import type { ExtensionCipher } from "../crypto/extensionCipherSchema.js"
import type { ExtensionFullWindowCommands } from "./ExtensionFullWindowCommands.js"
import type { ExtensionFullWindowViewModel } from "./ExtensionFullWindowViewModel.js"
import { extensionFullWindowCipherExtrasStateCreate } from "./extensionFullWindowCipherExtrasStateCreate.js"

export interface ExtensionFullWindowCipherExtrasProps {
  cipher: () => ExtensionCipher
  model: () => ExtensionFullWindowViewModel
  commands: ExtensionFullWindowCommands
  idPrefix?: string
}

export function ExtensionFullWindowCipherExtras(p: ExtensionFullWindowCipherExtrasProps): JSX.Element {
  const state = extensionFullWindowCipherExtrasStateCreate({
    cipher: p.cipher,
    model: p.model,
    commands: () => p.commands,
  })
  return (
    <div class="flex flex-col gap-3">
      <CardWrapper class="flex flex-col gap-3 border border-slate-200 dark:border-slate-700">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="font-semibold">Attachments ({state.attachments().length})</h3>
          <Show when={state.canEdit()}>
            <input
              ref={state.fileInputSet}
              type="file"
              class="hidden"
              aria-label="Upload attachment file"
              onChange={state.uploadChange}
            />
            <Button variant="outline" size="sm" disabled={state.anyAttachmentBusy()} onClick={state.uploadOpen}>
              {state.uploadBusy() ? "Uploading…" : "Add attachment"}
            </Button>
          </Show>
        </div>
        <Show when={state.uploadBusy()}>
          <div role="status" aria-live="polite" class="text-sm">
            Uploading attachment: {state.operationProgress() ?? 0}%
          </div>
        </Show>
        <Show
          when={state.attachments().length > 0}
          fallback={<p class="text-sm text-slate-600 dark:text-slate-300">No attachments.</p>}
        >
          <ul class="flex list-none flex-col gap-2">
            <For each={state.attachments()}>
              {(attachment) => (
                <li class="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 p-2 dark:border-slate-700">
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium">{attachment.fileName}</p>
                    <p class="text-xs text-slate-600 dark:text-slate-300">{state.sizeFormat(attachment)}</p>
                  </div>
                  <div class="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={state.anyAttachmentBusy()}
                      aria-label={`Download attachment ${attachment.fileName}`}
                      onClick={() => state.download(attachment)}
                    >
                      {state.attachmentBusy(attachment) && state.operationProgress() !== null
                        ? "Downloading…"
                        : "Download"}
                    </Button>
                    <Show when={state.canEdit()}>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={state.anyAttachmentBusy()}
                        aria-label={`Delete attachment ${attachment.fileName}`}
                        onClick={() => state.deleteOpen(attachment)}
                      >
                        Delete
                      </Button>
                    </Show>
                  </div>
                </li>
              )}
            </For>
          </ul>
        </Show>
        <Show when={state.deleteCandidate()}>
          {(attachment) => (
            <div
              role="alertdialog"
              aria-labelledby={`${p.idPrefix ?? ""}attachment-delete-title`}
              aria-describedby={`${p.idPrefix ?? ""}attachment-delete-description`}
              class="flex flex-col gap-2 rounded border border-red-300 p-3"
            >
              <h4 id={`${p.idPrefix ?? ""}attachment-delete-title`} class="font-semibold">
                Delete attachment?
              </h4>
              <p id={`${p.idPrefix ?? ""}attachment-delete-description`} class="text-sm">
                {attachment().fileName} will be permanently deleted.
              </p>
              <div class="flex gap-2">
                <Button variant="filledBlue" disabled={state.anyAttachmentBusy()} onClick={state.deleteConfirm}>
                  Delete
                </Button>
                <Button variant="outline" disabled={state.anyAttachmentBusy()} onClick={state.deleteCancel}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Show>
      </CardWrapper>

      <Show when={state.canViewHistory() && state.history().length > 0}>
        <CardWrapper class="flex flex-col gap-3 border border-slate-200 dark:border-slate-700">
          <h3 class="font-semibold">Password history ({state.history().length})</h3>
          <ul class="flex list-none flex-col gap-2">
            <For each={state.history()}>
              {(entry, index) => (
                <li class="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-200 p-2 dark:border-slate-700">
                  <div class="min-w-0">
                    <p class="truncate font-mono text-sm" aria-live="polite">
                      {state.historyRevealed(entry, index()) ? entry.password : "••••••••••••"}
                    </p>
                    <p class="text-xs text-slate-600 dark:text-slate-300">
                      Last used: {state.dateFormat(entry.lastUsedDate)}
                    </p>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={state.historyRevealed(entry, index()) ? "Hide past password" : "Reveal past password"}
                      aria-pressed={state.historyRevealed(entry, index())}
                      onClick={() => state.historyRevealToggle(entry, index())}
                    >
                      {state.historyRevealed(entry, index()) ? "Hide" : "Reveal"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label="Copy past password"
                      onClick={() => state.historyCopy(entry, index())}
                    >
                      {state.historyCopied(entry, index()) ? "Copied" : "Copy"}
                    </Button>
                    <Show when={state.canEdit()}>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={state.busy()}
                        onClick={() => state.restoreOpen(entry)}
                      >
                        Restore
                      </Button>
                    </Show>
                  </div>
                </li>
              )}
            </For>
          </ul>
          <Show when={state.restoreCandidate()}>
            <div
              role="alertdialog"
              aria-labelledby={`${p.idPrefix ?? ""}password-restore-title`}
              aria-describedby={`${p.idPrefix ?? ""}password-restore-description`}
              class="flex flex-col gap-2 rounded border border-amber-300 p-3"
            >
              <h4 id={`${p.idPrefix ?? ""}password-restore-title`} class="font-semibold">
                Restore this password?
              </h4>
              <p id={`${p.idPrefix ?? ""}password-restore-description`} class="text-sm">
                It will become the current password. The current password will be added to history.
              </p>
              <div class="flex gap-2">
                <Button variant="filledBlue" disabled={state.busy()} onClick={state.restoreConfirm}>
                  Restore password
                </Button>
                <Button variant="outline" disabled={state.busy()} onClick={state.restoreCancel}>
                  Cancel
                </Button>
              </div>
            </div>
          </Show>
        </CardWrapper>
      </Show>
      <Show when={state.errorMessage()}>
        {(message) => (
          <p role="alert" class="text-sm text-red-600 dark:text-red-400">
            {message()}
          </p>
        )}
      </Show>
    </div>
  )
}
