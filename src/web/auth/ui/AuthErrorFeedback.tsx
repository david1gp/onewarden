import type { Accessor, JSX } from "solid-js"
import { classMerge } from "#ui/utils/classMerge.js"

interface AuthErrorFeedbackProps {
  message: Accessor<string>
  class?: string
}

export function AuthErrorFeedback(props: AuthErrorFeedbackProps): JSX.Element {
  return (
    <div
      role="alert"
      class={classMerge(
        "rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300",
        props.class,
      )}
    >
      {props.message()}
    </div>
  )
}
