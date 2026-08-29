import type { JSX } from "solid-js"
import { AuthTwoFactorChallengeCard } from "./AuthTwoFactorChallengeCard.jsx"
import {
  type AuthTwoFactorChallengeViewProps,
  authTwoFactorChallengeViewStateCreate,
} from "./authTwoFactorChallengeViewStateCreate.js"

export function AuthTwoFactorChallengeView(props: AuthTwoFactorChallengeViewProps): JSX.Element {
  const state = authTwoFactorChallengeViewStateCreate(props)

  return (
    <div class="flex min-h-[70dvh] flex-col items-center justify-center p-4">
      <AuthTwoFactorChallengeCard
        session={state.session}
        onSuccess={state.handleSuccess}
        onCancel={state.handleCancel}
      />
    </div>
  )
}
