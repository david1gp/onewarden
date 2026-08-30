import { type JSX, Show, Switch, Match } from "solid-js"
import { CheckBooleanSingle } from "#ui/input/check/CheckBooleanSingle.jsx"
import { InputS } from "#ui/input/input/InputS.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { LabelAsterix } from "#ui/input/label/LabelAsterix.jsx"
import { SelectSingleNative } from "#ui/input/select/SelectSingleNative.jsx"
import { TextareaS } from "#ui/input/textarea/TextareaS.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { classesScrollbar } from "#ui/static/scrollbar/classesScrollbar.js"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import { CipherCardFormSection } from "./CipherCardFormSection.jsx"
import { CipherCustomFieldsEditor } from "./CipherCustomFieldsEditor.jsx"
import { CipherIdentityFormSection } from "./CipherIdentityFormSection.jsx"
import { CipherLoginFormSection } from "./CipherLoginFormSection.jsx"
import { CipherSecureNoteFormSection } from "./CipherSecureNoteFormSection.jsx"
import { type CipherEditFormStateProps, cipherEditFormStateCreate } from "./cipherEditFormStateCreate.js"

export function CipherEditForm(props: CipherEditFormStateProps): JSX.Element {
  const state = cipherEditFormStateCreate(props)

  return (
    <form
      onSubmit={state.handleSave}
      class={`flex h-full flex-col overflow-y-auto ${classesScrollbar} bg-slate-50 p-4 sm:p-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100`}
    >
      <div class="mx-auto w-full max-w-3xl space-y-5">
        {/* Header */}
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
          <div>
            <h2 class="font-bold text-lg text-slate-900 dark:text-slate-50">
              {state.isEditMode() ? "Edit Cipher" : "Add New Item"}
            </h2>
            <p class="text-sm text-slate-600 dark:text-slate-400">
              {state.isEditMode()
                ? "Modify credentials and security metadata."
                : "Create a new encrypted entry in your vault."}
            </p>
          </div>

          <div class="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="h-8 text-sm"
              onClick={state.handleCancel}
              disabled={state.isSaving()}
            >
              <Icon path={vaultSvgIcons.close} class="mr-1.5 size-3.5" />
              Cancel
            </Button>
            <Button
              type="submit"
              variant="filledBlue"
              size="sm"
              class="h-8 text-sm font-semibold"
              disabled={state.isSaving()}
            >
              <Icon path={vaultSvgIcons.save} class="mr-1.5 size-3.5" />
              {state.isSaving() ? "Saving..." : "Save Item"}
            </Button>
          </div>
        </div>

        {/* Error Banner */}
        <Show when={state.effectiveError()}>
          {(error) => (
            <div class="flex items-center gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300">
              <Icon path={vaultSvgIcons.shieldAlert} class="size-4 shrink-0 text-rose-700 dark:text-rose-300" />
              <span>{error()}</span>
            </div>
          )}
        </Show>

        {/* Type & General Details */}
        <CardWrapper class="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <p class="font-semibold text-slate-900 text-sm dark:text-slate-100">Item Information</p>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Type selector */}
            <div class="space-y-1 sm:col-span-1">
              <Label for="cipher-form-type" class="text-sm">
                Type
              </Label>
              <SelectSingleNative
                id="cipher-form-type"
                valueSignal={state.type}
                getOptions={state.typeOptions}
                valueText={state.typeLabel}
                class="h-9 text-sm py-1"
                disabled={state.isEditMode()}
              />
            </div>

            {/* Name / Title */}
            <div class="space-y-1 sm:col-span-2">
              <Label for="cipher-form-name" class="text-sm">
                Name <LabelAsterix />
              </Label>
              <InputS
                id="cipher-form-name"
                type="text"
                placeholder="e.g. GitHub Account, Personal Visa"
                valueSignal={state.name}
                class="h-9 w-full text-sm"
                required
              />
            </div>
          </div>

          {/* Folder & Favorite */}
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="space-y-1">
              <Label for="cipher-form-folder" class="text-sm">
                Folder ID
              </Label>
              <InputS
                id="cipher-form-folder"
                type="text"
                placeholder="e.g. folder-work"
                valueSignal={state.folderId}
                class="h-9 w-full text-sm"
              />
            </div>

            <div class="flex items-end">
              <CheckBooleanSingle
                valueSignal={state.favorite}
                valueText={(fav) => (fav ? "Favorited (Pinned to Favorites)" : "Add to Favorites")}
                class="h-9 w-full text-sm"
              />
            </div>
          </div>
        </CardWrapper>

        {/* Dynamic Type-specific Form Section */}
        <Switch>
          <Match when={state.numericType() === 1}>
            <CipherLoginFormSection
              usernameSignal={state.username}
              passwordSignal={state.password}
              totpSignal={state.totp}
              uriSignal={state.uri}
              urisSignal={state.loginUris}
            />
          </Match>
          <Match when={state.numericType() === 2}>
            <CipherSecureNoteFormSection notesSignal={state.notes} />
          </Match>
          <Match when={state.numericType() === 3}>
            <CipherCardFormSection
              cardholderNameSignal={state.cardholderName}
              brandSignal={state.brand}
              numberSignal={state.number}
              expMonthSignal={state.expMonth}
              expYearSignal={state.expYear}
              codeSignal={state.code}
            />
          </Match>
          <Match when={state.numericType() === 4}>
            <CipherIdentityFormSection
              titleSignal={state.title}
              firstNameSignal={state.firstName}
              middleNameSignal={state.middleName}
              lastNameSignal={state.lastName}
              companySignal={state.company}
              emailSignal={state.email}
              phoneSignal={state.phone}
              address1Signal={state.address1}
              address2Signal={state.address2}
              address3Signal={state.address3}
              citySignal={state.city}
              stateSignal={state.state}
              postalCodeSignal={state.postalCode}
              countrySignal={state.country}
              ssnSignal={state.ssn}
              passportNumberSignal={state.passportNumber}
              licenseNumberSignal={state.licenseNumber}
              usernameSignal={state.identityUsername}
            />
          </Match>
        </Switch>

        {/* Custom Fields Editor */}
        <CipherCustomFieldsEditor fieldsSignal={state.fields} />

        {/* Notes (for types other than secure note, which renders notes as main content) */}
        <Show when={state.numericType() !== 2}>
          <CardWrapper class="space-y-2 rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <Label for="cipher-form-notes" class="text-sm font-semibold">
              Notes
            </Label>
            <TextareaS
              id="cipher-form-notes"
              placeholder="Additional notes or context..."
              valueSignal={state.notes}
              rows={4}
              class="w-full text-sm font-mono"
            />
          </CardWrapper>
        </Show>

        {/* Bottom Save / Cancel Bar */}
        <div class="flex items-center justify-end gap-2 border-t border-slate-200 pt-4 pb-8 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            class="h-8 text-sm"
            onClick={state.handleCancel}
            disabled={state.isSaving()}
          >
            <Icon path={vaultSvgIcons.close} class="mr-1.5 size-3.5" />
            Cancel
          </Button>
          <Button
            type="submit"
            variant="filledBlue"
            size="sm"
            class="h-8 text-sm font-semibold"
            disabled={state.isSaving()}
          >
            <Icon path={vaultSvgIcons.save} class="mr-1.5 size-3.5" />
            {state.isSaving() ? "Saving..." : "Save Item"}
          </Button>
        </div>
      </div>
    </form>
  )
}
