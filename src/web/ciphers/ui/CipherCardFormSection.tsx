import type { JSX } from "solid-js"
import { InputS } from "#ui/input/input/InputS.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { SelectSingleNative } from "#ui/input/select/SelectSingleNative.jsx"
import { ButtonIcon } from "#ui/interactive/button/ButtonIcon.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import {
  type CipherCardFormSectionStateProps,
  cipherCardFormSectionStateCreate,
} from "./cipherCardFormSectionStateCreate.js"

export function CipherCardFormSection(props: CipherCardFormSectionStateProps): JSX.Element {
  const state = cipherCardFormSectionStateCreate(props)

  return (
    <CardWrapper class="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div class="flex items-center justify-between">
        <p class="font-semibold text-slate-900 text-sm dark:text-slate-100">Payment Card Details</p>
        <Badge variant="filledGreen" class="text-sm">
          {state.detectedBrand()}
        </Badge>
      </div>

      {/* Cardholder Name */}
      <div class="space-y-1">
        <Label for="cipher-cardholder-name" class="text-sm">
          Cardholder Name
        </Label>
        <InputS
          id="cipher-cardholder-name"
          type="text"
          placeholder="e.g. Alex J. Rivera"
          valueSignal={state.cardholderNameSignal}
          class="h-9 w-full text-sm"
        />
      </div>

      {/* Brand & Number */}
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div class="space-y-1 sm:col-span-1">
          <Label for="cipher-card-brand" class="text-sm">
            Brand
          </Label>
          <SelectSingleNative
            id="cipher-card-brand"
            valueSignal={state.brandSignal}
            getOptions={state.brandOptions}
            class="h-9 text-sm py-1"
          />
        </div>
        <div class="space-y-1 sm:col-span-2">
          <Label for="cipher-card-number" class="text-sm">
            Card Number
          </Label>
          <InputS
            id="cipher-card-number"
            type="text"
            placeholder="4242 •••• •••• ••••"
            valueSignal={state.numberSignal}
            class="h-9 w-full text-sm font-mono"
          />
        </div>
      </div>

      {/* Expiration & Security Code */}
      <div class="grid grid-cols-3 gap-3">
        <div class="space-y-1">
          <Label for="cipher-card-exp-month" class="text-sm">
            Exp Month
          </Label>
          <SelectSingleNative
            id="cipher-card-exp-month"
            valueSignal={state.expMonthSignal}
            getOptions={state.monthOptions}
            class="h-9 text-sm py-1"
          />
        </div>
        <div class="space-y-1">
          <Label for="cipher-card-exp-year" class="text-sm">
            Exp Year
          </Label>
          <InputS
            id="cipher-card-exp-year"
            type="text"
            placeholder="YYYY"
            valueSignal={state.expYearSignal}
            class="h-9 w-full text-sm"
          />
        </div>
        <div class="space-y-1">
          <Label for="cipher-card-cvv" class="text-sm">
            Security Code (CVV)
          </Label>
          <div class="relative flex items-center">
            <InputS
              id="cipher-card-cvv"
              type={state.isCodeRevealed() ? "text" : "password"}
              placeholder="123"
              valueSignal={state.codeSignal}
              class="h-9 w-full pr-14 text-sm font-mono"
            />
            <div class="absolute right-1 flex items-center">
              <ButtonIcon
                variant="ghost"
                size="sm"
                icon={state.isCodeRevealed() ? vaultSvgIcons.eyeOff : vaultSvgIcons.eye}
                iconClass="size-3.5"
                onClick={() => state.toggleCodeReveal()}
                class="h-8 px-2 text-sm text-slate-600 dark:text-slate-400"
                aria-label={state.isCodeRevealed() ? "Hide code" : "Show code"}
              >
                {state.isCodeRevealed() ? "Hide" : "Show"}
              </ButtonIcon>
            </div>
          </div>
        </div>
      </div>
    </CardWrapper>
  )
}
