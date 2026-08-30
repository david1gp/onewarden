import type { JSX } from "solid-js"
import { InputS } from "#ui/input/input/InputS.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { SelectSingleNative } from "#ui/input/select/SelectSingleNative.jsx"
import { ButtonIcon } from "#ui/interactive/button/ButtonIcon.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import {
  type CipherIdentityFormSectionStateProps,
  cipherIdentityFormSectionStateCreate,
} from "./cipherIdentityFormSectionStateCreate.js"

export function CipherIdentityFormSection(props: CipherIdentityFormSectionStateProps): JSX.Element {
  const state = cipherIdentityFormSectionStateCreate(props)

  return (
    <CardWrapper class="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <p class="font-semibold text-slate-900 text-sm dark:text-slate-100">Identity Details</p>

      {/* Name components */}
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div class="space-y-1 sm:col-span-1">
          <Label for="cipher-identity-title" class="text-sm">
            Title
          </Label>
          <SelectSingleNative
            id="cipher-identity-title"
            valueSignal={state.titleSignal}
            getOptions={state.titleOptions}
            class="h-9 text-sm py-1"
          />
        </div>
        <div class="space-y-1 sm:col-span-1">
          <Label for="cipher-identity-first-name" class="text-sm">
            First Name
          </Label>
          <InputS
            id="cipher-identity-first-name"
            type="text"
            placeholder="Alex"
            valueSignal={state.firstNameSignal}
            class="h-9 w-full text-sm"
          />
        </div>
        <div class="space-y-1 sm:col-span-1">
          <Label for="cipher-identity-middle-name" class="text-sm">
            Middle Name
          </Label>
          <InputS
            id="cipher-identity-middle-name"
            type="text"
            placeholder="J."
            valueSignal={state.middleNameSignal}
            class="h-9 w-full text-sm"
          />
        </div>
        <div class="space-y-1 sm:col-span-1">
          <Label for="cipher-identity-last-name" class="text-sm">
            Last Name
          </Label>
          <InputS
            id="cipher-identity-last-name"
            type="text"
            placeholder="Rivera"
            valueSignal={state.lastNameSignal}
            class="h-9 w-full text-sm"
          />
        </div>
      </div>

      {/* Contact & Company */}
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div class="space-y-1">
          <Label for="cipher-identity-company" class="text-sm">
            Company / Organization
          </Label>
          <InputS
            id="cipher-identity-company"
            type="text"
            placeholder="Acme Corp"
            valueSignal={state.companySignal}
            class="h-9 w-full text-sm"
          />
        </div>
        <div class="space-y-1">
          <Label for="cipher-identity-email" class="text-sm">
            Email
          </Label>
          <InputS
            id="cipher-identity-email"
            type="email"
            placeholder="alex@acme.com"
            valueSignal={state.emailSignal}
            class="h-9 w-full text-sm"
          />
        </div>
        <div class="space-y-1">
          <Label for="cipher-identity-phone" class="text-sm">
            Phone
          </Label>
          <InputS
            id="cipher-identity-phone"
            type="tel"
            placeholder="+1 555-0199"
            valueSignal={state.phoneSignal}
            class="h-9 w-full text-sm"
          />
        </div>
        <div class="space-y-1">
          <Label for="cipher-identity-username" class="text-sm">
            Username
          </Label>
          <InputS
            id="cipher-identity-username"
            type="text"
            placeholder="arivera"
            valueSignal={state.usernameSignal}
            class="h-9 w-full text-sm"
          />
        </div>
      </div>

      {/* Address */}
      <div class="space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800">
        <p class="font-semibold text-sm text-slate-600 uppercase tracking-wider dark:text-slate-400">Address</p>
        <div class="space-y-2">
          <InputS
            id="cipher-identity-address1"
            type="text"
            placeholder="Street Address Line 1"
            valueSignal={state.address1Signal}
            class="h-9 w-full text-sm"
            aria-label="Street Address Line 1"
          />
          <InputS
            id="cipher-identity-address2"
            type="text"
            placeholder="Street Address Line 2"
            valueSignal={state.address2Signal}
            class="h-9 w-full text-sm"
            aria-label="Street Address Line 2"
          />
          <InputS
            id="cipher-identity-address3"
            type="text"
            placeholder="Street Address Line 3"
            valueSignal={state.address3Signal}
            class="h-9 w-full text-sm"
            aria-label="Street Address Line 3"
          />
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <InputS
              id="cipher-identity-city"
              type="text"
              placeholder="City"
              valueSignal={state.citySignal}
              class="h-9 w-full text-sm"
              aria-label="City"
            />
            <InputS
              id="cipher-identity-state"
              type="text"
              placeholder="State / Province"
              valueSignal={state.stateSignal}
              class="h-9 w-full text-sm"
              aria-label="State / Province"
            />
            <InputS
              id="cipher-identity-postal"
              type="text"
              placeholder="Postal Code"
              valueSignal={state.postalCodeSignal}
              class="h-9 w-full text-sm"
              aria-label="Postal Code"
            />
            <InputS
              id="cipher-identity-country"
              type="text"
              placeholder="Country"
              valueSignal={state.countrySignal}
              class="h-9 w-full text-sm"
              aria-label="Country"
            />
          </div>
        </div>
      </div>

      {/* Official Identification */}
      <div class="space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800">
        <p class="font-semibold text-sm text-slate-600 uppercase tracking-wider dark:text-slate-400">
          Identification Numbers
        </p>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div class="space-y-1">
            <Label for="cipher-identity-ssn" class="text-sm">
              SSN / National ID
            </Label>
            <div class="relative flex items-center">
              <InputS
                id="cipher-identity-ssn"
                type={state.isSsnRevealed() ? "text" : "password"}
                placeholder="XXX-XX-XXXX"
                valueSignal={state.ssnSignal}
                class="h-9 w-full pr-14 text-sm font-mono"
              />
              <div class="absolute right-1 flex items-center">
                <ButtonIcon
                  variant="ghost"
                  size="sm"
                  icon={state.isSsnRevealed() ? vaultSvgIcons.eyeOff : vaultSvgIcons.eye}
                  iconClass="size-3.5"
                  onClick={() => state.toggleSsnReveal()}
                  class="h-8 px-2 text-sm text-slate-600 dark:text-slate-400"
                  aria-label={state.isSsnRevealed() ? "Hide SSN" : "Show SSN"}
                >
                  {state.isSsnRevealed() ? "Hide" : "Show"}
                </ButtonIcon>
              </div>
            </div>
          </div>

          <div class="space-y-1">
            <Label for="cipher-identity-passport" class="text-sm">
              Passport Number
            </Label>
            <div class="relative flex items-center">
              <InputS
                id="cipher-identity-passport"
                type={state.isPassportRevealed() ? "text" : "password"}
                placeholder="Passport #"
                valueSignal={state.passportNumberSignal}
                class="h-9 w-full pr-14 text-sm font-mono"
              />
              <div class="absolute right-1 flex items-center">
                <ButtonIcon
                  variant="ghost"
                  size="sm"
                  icon={state.isPassportRevealed() ? vaultSvgIcons.eyeOff : vaultSvgIcons.eye}
                  iconClass="size-3.5"
                  onClick={() => state.togglePassportReveal()}
                  class="h-8 px-2 text-sm text-slate-600 dark:text-slate-400"
                  aria-label={state.isPassportRevealed() ? "Hide Passport" : "Show Passport"}
                >
                  {state.isPassportRevealed() ? "Hide" : "Show"}
                </ButtonIcon>
              </div>
            </div>
          </div>

          <div class="space-y-1">
            <Label for="cipher-identity-license" class="text-sm">
              Driver's License
            </Label>
            <InputS
              id="cipher-identity-license"
              type="text"
              placeholder="License #"
              valueSignal={state.licenseNumberSignal}
              class="h-9 w-full text-sm font-mono"
            />
          </div>
        </div>
      </div>
    </CardWrapper>
  )
}
