import type { cipherPageStateCreate } from "./cipherPageStateCreate.js"

export interface CipherPageViewProps {
  readonly state: ReturnType<typeof cipherPageStateCreate>
  readonly defaultUri?: () => string | null
  readonly onNavigateBack?: () => void
}
