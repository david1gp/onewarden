import { createSignalObject } from "#ui/utils/createSignalObject.js"

export function adminDemoLoginViewStateCreate(onLogin: (token: string) => void) {
  const tokenInput = createSignalObject("")
  const tokenVisible = createSignalObject(false)
  const errorMessage = createSignalObject<string | null>(null)

  const tokenInputChange = (event: Event & { currentTarget: HTMLInputElement }) => {
    tokenInput.set(event.currentTarget.value)
    if (errorMessage.get() !== null) errorMessage.set(null)
  }
  const tokenVisibilityToggle = () => tokenVisible.set(!tokenVisible.get())
  const submit = (event: SubmitEvent) => {
    event.preventDefault()
    const token = tokenInput.get().trim()
    if (token.length === 0) {
      errorMessage.set("Enter a demo admin token to continue.")
      return
    }
    onLogin(token)
  }

  return {
    tokenInput: tokenInput.get,
    tokenVisible: tokenVisible.get,
    errorMessage: errorMessage.get,
    tokenInputChange,
    tokenVisibilityToggle,
    submit,
  }
}
