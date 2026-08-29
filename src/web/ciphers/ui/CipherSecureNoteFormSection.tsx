import type { JSX } from "solid-js"
import { Label } from "#ui/input/label/Label.jsx"
import { TextareaS } from "#ui/input/textarea/TextareaS.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import {
  type CipherSecureNoteFormSectionStateProps,
  cipherSecureNoteFormSectionStateCreate,
} from "./cipherSecureNoteFormSectionStateCreate.js"

export function CipherSecureNoteFormSection(props: CipherSecureNoteFormSectionStateProps): JSX.Element {
  const state = cipherSecureNoteFormSectionStateCreate(props)

  return (
    <CardWrapper class="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <p class="font-semibold text-slate-900 text-xs dark:text-slate-100">Secure Note Content</p>

      <div class="space-y-1">
        <Label for="cipher-secure-note-content" class="text-xs">
          Notes / Secret Content
        </Label>
        <TextareaS
          id="cipher-secure-note-content"
          placeholder="Enter confidential notes, recovery seeds, configuration, or keys..."
          valueSignal={state.notesSignal}
          rows={8}
          class="w-full text-xs font-mono leading-relaxed"
        />
      </div>
    </CardWrapper>
  )
}
