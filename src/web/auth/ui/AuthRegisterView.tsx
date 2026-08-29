import { type JSX, Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ButtonIcon } from "#ui/interactive/button/ButtonIcon.jsx"
import { LinkTextExternal } from "#ui/interactive/link/LinkText.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import { AuthErrorFeedback } from "./AuthErrorFeedback.jsx"
import { type AuthRegisterViewProps, authRegisterViewStateCreate } from "./authRegisterViewStateCreate.js"

export function AuthRegisterView(props: AuthRegisterViewProps): JSX.Element {
  const state = authRegisterViewStateCreate(props)

  return (
    <div class="flex min-h-[70dvh] flex-col items-center justify-center p-4">
      <CardWrapper class="w-full max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div class="text-center">
          <div class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-8 ring-blue-50/50 dark:bg-blue-950/50 dark:text-blue-400 dark:ring-blue-950/30">
            <Icon path={vaultSvgIcons.shieldCheck} class="size-7 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 class="mt-4 font-bold text-2xl text-slate-900 tracking-tight dark:text-slate-50">Create an Account</h1>
          <p class="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Get started with end-to-end encrypted password and credential storage.
          </p>
        </div>

        <Show when={state.errorMessage()}>{(msg) => <AuthErrorFeedback message={msg} />}</Show>

        <Show when={state.successMessage()}>
          {(msg) => (
            <div
              role="status"
              class="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              {msg()}
            </div>
          )}
        </Show>

        <form onSubmit={state.handleSubmit} class="space-y-4">
          <div>
            <Label for="register-email" class="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Email Address *
            </Label>
            <Input
              id="register-email"
              type="email"
              autocomplete="username"
              placeholder="user@example.com"
              value={state.email()}
              onInput={(e) => state.setEmail(e.currentTarget.value)}
              required
              class="mt-1 h-9 w-full rounded-md border-slate-200 bg-slate-50 px-3 text-xs focus:bg-white dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div>
            <Label for="register-name" class="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Your Name (Optional)
            </Label>
            <Input
              id="register-name"
              type="text"
              autocomplete="name"
              placeholder="Alice Smith"
              value={state.name()}
              onInput={(e) => state.setName(e.currentTarget.value)}
              class="mt-1 h-9 w-full rounded-md border-slate-200 bg-slate-50 px-3 text-xs focus:bg-white dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div>
            <Label for="register-password" class="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Master Password *
            </Label>
            <div class="relative mt-1">
              <Input
                id="register-password"
                type={state.showPassword() ? "text" : "password"}
                autocomplete="new-password"
                placeholder="At least 8 characters"
                value={state.masterPassword()}
                onInput={(e) => state.setMasterPassword(e.currentTarget.value)}
                required
                class="h-9 w-full rounded-md border-slate-200 bg-slate-50 pr-10 pl-3 text-xs focus:bg-white dark:border-slate-700 dark:bg-slate-800"
              />
              <ButtonIcon
                type="button"
                variant="ghost"
                class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-600 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-200"
                icon={state.showPassword() ? vaultSvgIcons.eyeOff : vaultSvgIcons.eye}
                iconClass="size-4"
                aria-label={state.showPassword() ? "Hide master password" : "Show master password"}
                onClick={state.togglePasswordVisibility}
              />
            </div>
          </div>

          <div>
            <Label for="register-confirm-password" class="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Confirm Master Password *
            </Label>
            <Input
              id="register-confirm-password"
              type={state.showPassword() ? "text" : "password"}
              autocomplete="new-password"
              placeholder="Re-enter master password"
              value={state.confirmPassword()}
              onInput={(e) => state.setConfirmPassword(e.currentTarget.value)}
              required
              class="mt-1 h-9 w-full rounded-md border-slate-200 bg-slate-50 px-3 text-xs focus:bg-white dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div>
            <Label for="register-hint" class="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Master Password Hint (Optional)
            </Label>
            <Input
              id="register-hint"
              type="text"
              placeholder="A reminder only you will understand"
              value={state.passwordHint()}
              onInput={(e) => state.setPasswordHint(e.currentTarget.value)}
              class="mt-1 h-9 w-full rounded-md border-slate-200 bg-slate-50 px-3 text-xs focus:bg-white dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div class="pt-2">
            <Button
              type="submit"
              variant="filledBlue"
              class="w-full justify-center text-xs font-semibold"
              disabled={state.isSubmitting()}
            >
              <Show when={state.isSubmitting()} fallback="Create Account">
                Generating Keys & Creating Account...
              </Show>
            </Button>
          </div>
        </form>

        <div class="border-t border-slate-100 pt-4 text-center text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
          Already have an account?{" "}
          <LinkTextExternal href="/login" class="font-semibold">
            Log In
          </LinkTextExternal>
        </div>
      </CardWrapper>
    </div>
  )
}
