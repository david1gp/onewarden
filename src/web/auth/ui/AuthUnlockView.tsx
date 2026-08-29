import type { JSX } from "solid-js"
import { AuthUnlockCard } from "./AuthUnlockCard.jsx"
import { type AuthUnlockViewProps, authUnlockViewStateCreate } from "./authUnlockViewStateCreate.js"

export function AuthUnlockView(props: AuthUnlockViewProps): JSX.Element {
  const state = authUnlockViewStateCreate(props)

  return (
    <div class="flex min-h-[70dvh] flex-col items-center justify-center p-4">
      <AuthUnlockCard
        email={state.email}
        onSubmit={state.handleUnlock}
        onLogout={state.handleLogout}
        errorMessage={state.errorMessage}
        isSubmitting={state.isSubmitting}
      />
    </div>
  )
}
