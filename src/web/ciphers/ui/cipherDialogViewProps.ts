import type { cipherDialogStateCreate } from "./cipherDialogStateCreate.js"

export interface CipherDialogViewProps {
  readonly state: ReturnType<typeof cipherDialogStateCreate>
}
