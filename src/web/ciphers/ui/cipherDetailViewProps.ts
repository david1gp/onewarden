import type { cipherDetailViewStateCreate } from "./cipherDetailViewStateCreate.js"

export interface CipherDetailViewProps {
  readonly state: ReturnType<typeof cipherDetailViewStateCreate>
}
