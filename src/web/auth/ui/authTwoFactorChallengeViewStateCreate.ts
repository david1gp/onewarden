import type { webAuthSessionCreate } from "../model/webAuthSessionCreate.js"
import { webAuthSessionDefault } from "../model/webAuthSessionDefault.js"

export interface AuthTwoFactorChallengeViewProps {
  session?: ReturnType<typeof webAuthSessionCreate>
  onSuccess?: () => void
  onCancel?: () => void
}

export function authTwoFactorChallengeViewStateCreate(props: AuthTwoFactorChallengeViewProps = {}) {
  const session = props.session ?? webAuthSessionDefault()

  return {
    session,
    handleSuccess: () => props.onSuccess?.(),
    handleCancel: () => {
      session.pendingTwoFactorSet(null)
      props.onCancel?.()
    },
  }
}
