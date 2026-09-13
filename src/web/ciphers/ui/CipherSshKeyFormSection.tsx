import type { JSX } from "solid-js"
import { TextareaS } from "#ui/input/textarea/TextareaS.jsx"
import { InputS } from "#ui/input/input/InputS.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import {
  type CipherSshKeyFormSectionStateProps,
  cipherSshKeyFormSectionStateCreate,
} from "./cipherSshKeyFormSectionStateCreate.js"

export function CipherSshKeyFormSection(props: CipherSshKeyFormSectionStateProps): JSX.Element {
  const state = cipherSshKeyFormSectionStateCreate(props)

  return (
    <CardWrapper class="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <p class="font-semibold text-slate-900 text-sm dark:text-slate-100">SSH Key Details</p>
      <div class="space-y-1">
        <Label for="cipher-ssh-private-key" class="text-sm">
          Private key
        </Label>
        <TextareaS
          id="cipher-ssh-private-key"
          required
          rows={8}
          autocomplete="off"
          spellcheck={false}
          valueSignal={state.privateKeySignal}
          class="w-full font-mono text-sm"
        />
      </div>
      <div class="space-y-1">
        <Label for="cipher-ssh-public-key" class="text-sm">
          Public key
        </Label>
        <TextareaS
          id="cipher-ssh-public-key"
          required
          rows={3}
          autocomplete="off"
          spellcheck={false}
          valueSignal={state.publicKeySignal}
          class="w-full font-mono text-sm"
        />
      </div>
      <div class="space-y-1">
        <Label for="cipher-ssh-fingerprint" class="text-sm">
          Fingerprint
        </Label>
        <InputS
          id="cipher-ssh-fingerprint"
          required
          autocomplete="off"
          spellcheck={false}
          valueSignal={state.fingerprintSignal}
          class="h-9 w-full font-mono text-sm"
        />
      </div>
    </CardWrapper>
  )
}
