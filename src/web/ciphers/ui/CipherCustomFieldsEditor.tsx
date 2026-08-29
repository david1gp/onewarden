import { For, type JSX, Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { SelectSingleNative } from "#ui/input/select/SelectSingleNative.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ButtonIcon } from "#ui/interactive/button/ButtonIcon.jsx"
import { ButtonIconOnly } from "#ui/interactive/button/ButtonIconOnly.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import {
  type CipherCustomFieldsEditorStateProps,
  cipherCustomFieldsEditorStateCreate,
} from "./cipherCustomFieldsEditorStateCreate.js"

export function CipherCustomFieldsEditor(props: CipherCustomFieldsEditorStateProps): JSX.Element {
  const state = cipherCustomFieldsEditorStateCreate(props)

  const fieldTypeOptions = () => ["0", "1", "2", "3"]
  const fieldTypeLabel = (v: string) => {
    switch (v) {
      case "0":
        return "Text"
      case "1":
        return "Hidden"
      case "2":
        return "Boolean"
      case "3":
        return "Linked"
      default:
        return "Text"
    }
  }

  return (
    <CardWrapper class="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div class="flex items-center justify-between">
        <Label class="font-semibold text-slate-900 text-xs dark:text-slate-100">Custom Fields</Label>
        <span class="text-[11px] text-slate-400">Additional metadata fields</span>
      </div>

      <div class="space-y-3">
        <For each={state.fields()}>
          {(field, idx) => (
            <div class="flex flex-col gap-2 rounded-md border border-slate-100 bg-slate-50/50 p-2.5 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-950/40">
              <div class="w-full sm:w-1/3">
                <Input
                  type="text"
                  placeholder="Field name"
                  value={field.name}
                  onInput={(e) => state.updateFieldName(idx(), e.currentTarget.value)}
                  class="h-8 w-full text-xs"
                  aria-label={`Field name ${idx() + 1}`}
                />
              </div>

              <div class="w-full flex-1">
                <Show
                  when={field.type !== 2}
                  fallback={
                    <Button
                      variant={field.value === "true" ? "filledGreen" : "outline"}
                      size="sm"
                      class="h-8 w-full text-xs"
                      onClick={() => state.updateFieldValue(idx(), field.value === "true" ? "false" : "true")}
                    >
                      {field.value === "true" ? "Enabled (true)" : "Disabled (false)"}
                    </Button>
                  }
                >
                  <Input
                    type={field.type === 1 ? "password" : "text"}
                    placeholder="Field value"
                    value={field.value}
                    onInput={(e) => state.updateFieldValue(idx(), e.currentTarget.value)}
                    class="h-8 w-full text-xs"
                    aria-label={`Field value ${idx() + 1}`}
                  />
                </Show>
              </div>

              <div class="flex items-center gap-1.5 sm:w-auto">
                <select
                  class="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  value={String(field.type)}
                  onChange={(e) =>
                    state.updateFieldType(idx(), Number.parseInt(e.currentTarget.value, 10) as 0 | 1 | 2 | 3)
                  }
                  aria-label={`Field type ${idx() + 1}`}
                >
                  <option value="0">Text</option>
                  <option value="1">Hidden</option>
                  <option value="2">Boolean</option>
                  <option value="3">Linked</option>
                </select>

                <ButtonIconOnly
                  variant="ghost"
                  icon={vaultSvgIcons.trash}
                  iconClass="size-3.5 text-rose-500 hover:text-rose-700 dark:text-rose-400"
                  title="Remove field"
                  aria-label="Remove field"
                  onClick={() => state.removeField(idx())}
                  class="size-8 p-0"
                />
              </div>
            </div>
          )}
        </For>
      </div>

      {/* Add new field row */}
      <div class="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center">
        <div class="flex-1">
          <Input
            type="text"
            placeholder="New field label..."
            value={state.newFieldName.get()}
            onInput={(e) => state.newFieldName.set(e.currentTarget.value)}
            class="h-8 w-full text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                state.addField()
              }
            }}
          />
        </div>
        <div class="w-full sm:w-32">
          <SelectSingleNative
            valueSignal={state.newFieldType}
            getOptions={fieldTypeOptions}
            valueText={fieldTypeLabel}
            class="h-8 text-xs py-1"
          />
        </div>
        <ButtonIcon
          variant="outline"
          size="sm"
          icon={vaultSvgIcons.plus}
          iconClass="size-3.5"
          onClick={() => state.addField()}
          class="h-8 shrink-0 text-xs"
        >
          Add Field
        </ButtonIcon>
      </div>
    </CardWrapper>
  )
}
