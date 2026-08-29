import { For, type JSX, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ButtonIcon } from "#ui/interactive/button/ButtonIcon.jsx"
import { LinkTextExternal } from "#ui/interactive/link/LinkText.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import {
  type CipherAttachmentsSectionStateProps,
  cipherAttachmentsSectionStateCreate,
} from "./cipherAttachmentsSectionStateCreate.js"

export function CipherAttachmentsSection(props: CipherAttachmentsSectionStateProps): JSX.Element {
  const state = cipherAttachmentsSectionStateCreate(props)

  return (
    <CardWrapper class="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <Icon path={vaultSvgIcons.paperclip} class="size-4 text-slate-600 dark:text-slate-400" />
          <p class="font-semibold text-slate-900 text-xs dark:text-slate-100">
            Attachments {state.hasAttachments() ? `(${state.attachments().length})` : ""}
          </p>
        </div>

        <Show when={!state.readOnly}>
          <div>
            <input
              type="file"
              class="hidden"
              ref={state.setFileInputRef}
              onChange={state.handleFileChange}
              aria-label="Upload attachment file"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="text-xs"
              onClick={state.triggerFileInput}
              disabled={state.isUploading()}
            >
              {state.isUploading() ? "Uploading..." : "Add Attachment"}
            </Button>
          </div>
        </Show>
      </div>

      <Show when={state.errorMessage()}>
        {(err) => <p class="text-xs text-rose-700 dark:text-rose-300">{err()}</p>}
      </Show>

      <Show
        when={state.hasAttachments()}
        fallback={
          <p class="text-xs text-slate-600 dark:text-slate-400">No attachments uploaded for this cipher item.</p>
        }
      >
        <ul class="divide-y divide-slate-100 rounded-md border border-slate-100 dark:divide-slate-800 dark:border-slate-800">
          <For each={state.attachments()}>
            {(attachment) => (
              <li class="flex items-center justify-between gap-3 p-2.5 text-xs">
                <div class="flex min-w-0 items-center gap-2">
                  <Icon path={vaultSvgIcons.paperclip} class="size-3.5 shrink-0 text-slate-600 dark:text-slate-400" />
                  <div class="min-w-0">
                    <p class="truncate font-medium text-slate-800 dark:text-slate-200">{attachment.fileName}</p>
                    <p class="text-[11px] text-slate-600 dark:text-slate-400">{state.formatSize(attachment)}</p>
                  </div>
                </div>

                <div class="flex shrink-0 items-center gap-1.5">
                  <Show when={attachment.url}>
                    <LinkTextExternal
                      href={attachment.url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 font-medium text-[11px] text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      <Icon path={vaultSvgIcons.download} class="size-3" />
                      Download
                    </LinkTextExternal>
                  </Show>

                  <Show when={!state.readOnly}>
                    <ButtonIcon
                      variant="ghost"
                      size="sm"
                      class="text-xs text-rose-700 hover:bg-rose-50 hover:text-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/50"
                      icon={vaultSvgIcons.trash}
                      iconClass="size-3.5"
                      onClick={() => state.handleDelete(attachment.id)}
                      disabled={state.deletingId() === attachment.id}
                      aria-label={`Delete attachment ${attachment.fileName}`}
                    >
                      {state.deletingId() === attachment.id ? "Deleting..." : "Delete"}
                    </ButtonIcon>
                  </Show>
                </div>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </CardWrapper>
  )
}
