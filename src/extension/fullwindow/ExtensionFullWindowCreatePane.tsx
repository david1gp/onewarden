import { For, Show } from "solid-js"
import { InputS } from "#ui/input/input/InputS.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { SelectSingleNative } from "#ui/input/select/SelectSingleNative.jsx"
import { SwitchSingle } from "#ui/input/switch/SwitchSingle.jsx"
import { TextareaS } from "#ui/input/textarea/TextareaS.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { LoaderShuffle4Dots } from "#ui/static/loaders/LoaderShuffle4Dots.jsx"
import { Separator } from "#ui/static/separator/Separator.jsx"
import type { ExtensionCreateLoginRequest } from "../create/extensionCreateLoginRequestSchema.js"
import type { ExtensionFullWindowCreatePrefill } from "./ExtensionFullWindowCreatePrefill.js"
import { extensionFullWindowCreatePaneStateCreate } from "./extensionFullWindowCreatePaneStateCreate.js"

const booleanOptions = ["false", "true"]
const booleanLabels: Record<string, string> = { false: "No", true: "Yes" }
const fieldTypeOptions = ["text", "hidden", "boolean"]
const fieldTypeLabels: Record<string, string> = {
  text: "Text",
  hidden: "Hidden",
  boolean: "Boolean",
}

export interface ExtensionFullWindowCreatePaneProps {
  prefill: ExtensionFullWindowCreatePrefill
  status: string
  errorMessage: string | null
  onCreate: (request: ExtensionCreateLoginRequest) => void
  onDraftSave: (request: ExtensionCreateLoginRequest) => void
  onDraftDiscard: (draftId: string) => void
  onCancel: () => void
}

/** Full-window editor that creates one personal login entry. */
export function ExtensionFullWindowCreatePane(p: ExtensionFullWindowCreatePaneProps) {
  const state = extensionFullWindowCreatePaneStateCreate({
    prefill: () => p.prefill,
    status: () => p.status,
    serverErrorMessage: () => p.errorMessage,
    loginCreate: (request) => p.onCreate(request),
    draftSave: (request) => p.onDraftSave(request),
    draftDiscard: (draftId) => p.onDraftDiscard(draftId),
    cancel: () => p.onCancel(),
  })

  return (
    <CardWrapper class="flex max-w-2xl flex-col gap-3 p-4" aria-label="Add login">
      <h2 class="text-base font-semibold">Add login</h2>

      <Show when={state.isSaved()}>
        <p role="status" class="text-sm text-green-700 dark:text-green-400">
          Login saved.
        </p>
      </Show>

      <Show when={state.errorMessage()}>
        {(message) => (
          <p role="alert" class="text-sm text-red-600 dark:text-red-400">
            {message()}
          </p>
        )}
      </Show>

      <div class="flex flex-col gap-1">
        <Label for="extension-create-name">Name</Label>
        <InputS id="extension-create-name" type="text" disabled={state.isSaving()} valueSignal={state.nameSignal} />
      </div>

      <fieldset class="flex flex-col gap-1">
        <legend class="text-sm font-medium">Website URIs</legend>
        <For each={state.uris()}>
          {(_uri, index) => (
            <div class="flex items-center gap-1">
              <InputS
                type="text"
                aria-label={`Website URI ${index() + 1}`}
                disabled={state.isSaving()}
                valueSignal={state.uriSignal(index())}
              />
              <Show when={state.uris().length > 1}>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={state.isSaving()}
                  aria-label={`Remove website URI ${index() + 1}`}
                  onClick={() => state.uriRemove(index())}
                >
                  Remove
                </Button>
              </Show>
            </div>
          )}
        </For>
        <div>
          <Button variant="outline" size="sm" disabled={state.isSaving()} onClick={state.uriAdd}>
            Add URI
          </Button>
        </div>
      </fieldset>

      <div class="flex flex-col gap-1">
        <Label for="extension-create-username">Username</Label>
        <InputS
          id="extension-create-username"
          type="text"
          autocomplete="off"
          disabled={state.isSaving()}
          valueSignal={state.usernameSignal}
        />
      </div>

      <div class="flex flex-col gap-1">
        <Label for="extension-create-password">Password</Label>
        <div class="flex items-center gap-1">
          <InputS
            id="extension-create-password"
            type={state.passwordType()}
            autocomplete="new-password"
            disabled={state.isSaving()}
            valueSignal={state.passwordSignal}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={state.isSaving()}
            aria-label={state.passwordToggleLabel()}
            onClick={() => state.passwordVisibleSignal.set(!state.passwordVisibleSignal.get())}
          >
            {state.passwordVisibleSignal.get() ? "Hide" : "Show"}
          </Button>
        </div>
      </div>

      <div class="flex flex-col gap-1">
        <Label for="extension-create-notes">Notes</Label>
        <TextareaS id="extension-create-notes" disabled={state.isSaving()} valueSignal={state.notesSignal} />
      </div>

      <div class="flex flex-col gap-1">
        <Label for="extension-create-folder">Folder ID</Label>
        <InputS
          id="extension-create-folder"
          type="text"
          placeholder="Optional"
          disabled={state.isSaving()}
          valueSignal={state.folderIdSignal}
        />
      </div>

      <div class="flex flex-col gap-1">
        <Label for="extension-create-favorite">Favorite</Label>
        <SwitchSingle
          id="extension-create-favorite"
          disabled={state.isSaving()}
          valueSignal={state.favoriteSignal}
          getOptions={() => booleanOptions}
          valueText={(value) => booleanLabels[value] ?? value}
        />
      </div>

      <Separator />

      <fieldset class="flex flex-col gap-2">
        <legend class="text-sm font-medium">Custom fields</legend>
        <For each={state.fields()}>
          {(field, index) => (
            <div class="flex flex-wrap items-center gap-1">
              <InputS
                type="text"
                aria-label={`Custom field ${index() + 1} name`}
                disabled={state.isSaving()}
                valueSignal={state.fieldNameSignal(field)}
              />
              <SelectSingleNative
                aria-label={`Custom field ${index() + 1} type`}
                disabled={state.isSaving()}
                valueSignal={state.fieldTypeSignal(field)}
                getOptions={() => fieldTypeOptions}
                valueText={(type) => fieldTypeLabels[type] ?? type}
              />
              <Show
                when={field.type !== "boolean"}
                fallback={
                  <fieldset>
                    <legend class="sr-only">{`Custom field ${index() + 1} value`}</legend>
                    <SwitchSingle
                      disabled={state.isSaving()}
                      valueSignal={state.fieldBooleanSignal(field)}
                      getOptions={() => booleanOptions}
                      valueText={(value) => booleanLabels[value] ?? value}
                    />
                  </fieldset>
                }
              >
                <InputS
                  type={field.type === "hidden" ? "password" : "text"}
                  autocomplete="off"
                  aria-label={`Custom field ${index() + 1} value`}
                  disabled={state.isSaving()}
                  valueSignal={state.fieldValueSignal(field)}
                />
              </Show>
              <Button
                variant="outline"
                size="sm"
                disabled={state.isSaving()}
                aria-label={`Remove custom field ${index() + 1}`}
                onClick={() => state.fieldRemove(field)}
              >
                Remove
              </Button>
            </div>
          )}
        </For>
        <div class="flex flex-wrap gap-1">
          <Button variant="outline" size="sm" disabled={state.isSaving()} onClick={() => state.fieldAdd("text")}>
            Add text field
          </Button>
          <Button variant="outline" size="sm" disabled={state.isSaving()} onClick={() => state.fieldAdd("hidden")}>
            Add hidden field
          </Button>
          <Button variant="outline" size="sm" disabled={state.isSaving()} onClick={() => state.fieldAdd("boolean")}>
            Add boolean field
          </Button>
        </div>
      </fieldset>

      <Separator />

      <Show when={state.isSaving()}>
        <div role="status" aria-label="Saving login" class="flex justify-center py-2">
          <LoaderShuffle4Dots />
        </div>
      </Show>

      <Show when={state.discardPending()}>
        <div role="alertdialog" aria-label="Discard this login" class="flex flex-wrap items-center gap-2">
          <p class="text-sm">Discard this unsaved login?</p>
          <Button variant="filled" size="sm" onClick={state.cancel}>
            Discard
          </Button>
          <Button variant="outline" size="sm" onClick={state.discardKeep}>
            Keep editing
          </Button>
        </div>
      </Show>

      <div class="flex gap-1">
        <Button variant="filled" disabled={state.isSaving()} onClick={state.save}>
          Save login
        </Button>
        <Button variant="outline" disabled={state.isSaving()} onClick={state.cancel}>
          Cancel
        </Button>
      </div>
    </CardWrapper>
  )
}
