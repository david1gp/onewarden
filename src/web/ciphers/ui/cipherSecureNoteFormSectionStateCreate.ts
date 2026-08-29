import type { SignalObject } from "#ui/utils/createSignalObject.js"

export interface CipherSecureNoteFormSectionStateProps {
  notesSignal: SignalObject<string>
}

export function cipherSecureNoteFormSectionStateCreate(props: CipherSecureNoteFormSectionStateProps) {
  return {
    notesSignal: props.notesSignal,
  }
}
