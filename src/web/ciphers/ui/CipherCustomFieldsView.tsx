import { For, type JSX, Show } from "solid-js"
import { ButtonIcon } from "#ui/interactive/button/ButtonIcon.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import { CopyActionButton } from "../../../ui/interactive/button/CopyActionButton.jsx"
import { LabeledValueRow } from "../../../ui/static/value/LabeledValueRow.jsx"
import {
  type CipherCustomFieldsViewStateProps,
  cipherCustomFieldsViewStateCreate,
} from "./cipherCustomFieldsViewStateCreate.js"

export function CipherCustomFieldsView(props: CipherCustomFieldsViewStateProps): JSX.Element {
  const state = cipherCustomFieldsViewStateCreate(props)

  return (
    <Show when={state.fields().length > 0}>
      <CardWrapper class="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <p class="font-semibold text-slate-900 text-sm dark:text-slate-100">Custom Fields</p>
        <div class="space-y-2.5">
          <For each={state.fields()}>
            {(field, idx) => {
              const isRevealed = () => field.type !== 1 || state.isFieldRevealed(idx())
              const isCopied = () => state.copiedFieldIndex() === idx()

              return (
                <LabeledValueRow
                  class="gap-2 border-b border-slate-100 pb-2.5 last:border-0 last:pb-0 dark:border-slate-800/80"
                  label={field.name}
                  labelClass="truncate font-semibold text-sm text-slate-600 uppercase tracking-wider dark:text-slate-400"
                  value={
                    <Show
                      when={field.type !== 2}
                      fallback={
                        <Badge
                          variant={field.value === "true" || field.value === "1" ? "filledGreen" : "subtle"}
                          class="mt-0.5 text-sm"
                        >
                          {field.value === "true" || field.value === "1" ? "Enabled / Checked" : "Disabled / Unchecked"}
                        </Badge>
                      }
                    >
                      <p class="truncate font-mono text-slate-800 text-sm select-all dark:text-slate-200">
                        {isRevealed() ? field.value : "••••••••••••"}
                      </p>
                    </Show>
                  }
                  actionClass="gap-1.5"
                  action={
                    <>
                      <Show when={field.type === 1}>
                        <ButtonIcon
                          variant="ghost"
                          size="sm"
                          class="h-8 text-sm"
                          icon={isRevealed() ? vaultSvgIcons.eyeOff : vaultSvgIcons.eye}
                          iconClass="size-3.5 fill-current dark:fill-current text-slate-600 dark:text-slate-400"
                          onClick={() => state.toggleConcealedField(idx())}
                          aria-label={isRevealed() ? "Hide field value" : "Show field value"}
                        >
                          {isRevealed() ? "Hide" : "Show"}
                        </ButtonIcon>
                      </Show>
                      <Show when={field.type !== 2}>
                        <CopyActionButton
                          isCopied={isCopied()}
                          label="Copy"
                          copiedLabel="Copied"
                          ariaLabel="Copy field value"
                          copiedAriaLabel="Copied"
                          variant="subtle"
                          size="sm"
                          class="h-8 text-sm"
                          iconClass={`size-3.5 fill-current dark:fill-current ${
                            isCopied() ? "text-emerald-700 dark:text-emerald-300" : "text-slate-600 dark:text-slate-400"
                          }`}
                          onCopy={() => state.copyField(idx(), field.value)}
                        />
                      </Show>
                    </>
                  }
                />
              )
            }}
          </For>
        </div>
      </CardWrapper>
    </Show>
  )
}
