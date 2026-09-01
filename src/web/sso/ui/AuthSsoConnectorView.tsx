import { type JSX, Match, Show, Switch } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ButtonIcon } from "#ui/interactive/button/ButtonIcon.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { LoaderShuffle4Dots } from "#ui/static/loaders/LoaderShuffle4Dots.jsx"
import { AuthErrorFeedback } from "../../auth/ui/AuthErrorFeedback.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import { type AuthSsoConnectorViewProps, authSsoConnectorViewStateCreate } from "./authSsoConnectorViewStateCreate.js"

export function AuthSsoConnectorView(props: AuthSsoConnectorViewProps): JSX.Element {
  const state = authSsoConnectorViewStateCreate(props)

  return (
    <div class="flex min-h-[70dvh] flex-col items-center justify-center p-4">
      <CardWrapper class="w-full max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <Switch>
          <Match when={state.status() === "connecting" || state.status() === "exchanging"}>
            <div class="space-y-4">
              <div class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-8 ring-blue-50/50 dark:bg-blue-950/50 dark:text-blue-400 dark:ring-blue-950/30">
                <Icon path={vaultSvgIcons.key} class="size-7 text-blue-600 dark:text-blue-400" />
              </div>
              <h1 class="font-bold text-2xl text-slate-900 tracking-tight dark:text-slate-50">
                <Show when={state.status() === "connecting"} fallback="Exchanging Credentials...">
                  Connecting to Single Sign-On...
                </Show>
              </h1>
              <p class="text-sm text-slate-600 dark:text-slate-400">
                Please wait while we verify your SSO authentication session.
              </p>
              <div class="flex justify-center py-4">
                <LoaderShuffle4Dots class="size-8 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </Match>

          <Match when={state.status() === "setup-required"}>
            <div class="space-y-4">
              <div class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-8 ring-amber-50/50 dark:bg-amber-950/50 dark:text-amber-400 dark:ring-amber-950/30">
                <Icon path={vaultSvgIcons.shieldCheck} class="size-7 text-amber-600 dark:text-amber-400" />
              </div>
              <h1 class="font-bold text-2xl text-slate-900 tracking-tight dark:text-slate-50">
                Account Setup Required
              </h1>
              <div class="rounded-md border border-amber-200 bg-amber-50 p-4 text-left text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                <p>{state.setupMessage()}</p>
                <Show when={state.setupEmail()}>{(email) => <p class="mt-2 font-semibold">{email()}</p>}</Show>
              </div>

              <Show when={state.setupErrorMessage()}>{(msg) => <AuthErrorFeedback message={msg} />}</Show>

              <form onSubmit={state.setupSubmit} class="space-y-4 text-left">
                <div>
                  <Label for="sso-setup-password" class="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Master Password *
                  </Label>
                  <div class="relative mt-1">
                    <Input
                      id="sso-setup-password"
                      type={state.showPassword() ? "text" : "password"}
                      autocomplete="new-password"
                      placeholder="At least 8 characters"
                      value={state.masterPassword()}
                      onInput={(e) => state.setMasterPassword(e.currentTarget.value)}
                      required
                      class="h-9 w-full rounded-md border-slate-200 bg-slate-50 pr-10 pl-3 text-sm focus:bg-white dark:border-slate-700 dark:bg-slate-800"
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
                  <Label
                    for="sso-setup-confirm-password"
                    class="block text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Confirm Master Password *
                  </Label>
                  <Input
                    id="sso-setup-confirm-password"
                    type={state.showPassword() ? "text" : "password"}
                    autocomplete="new-password"
                    placeholder="Re-enter master password"
                    value={state.confirmPassword()}
                    onInput={(e) => state.setConfirmPassword(e.currentTarget.value)}
                    required
                    class="mt-1 h-9 w-full rounded-md border-slate-200 bg-slate-50 px-3 text-sm focus:bg-white dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <Label for="sso-setup-hint" class="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Master Password Hint (Optional)
                  </Label>
                  <Input
                    id="sso-setup-hint"
                    type="text"
                    placeholder="A reminder only you will understand"
                    value={state.passwordHint()}
                    onInput={(e) => state.setPasswordHint(e.currentTarget.value)}
                    class="mt-1 h-9 w-full rounded-md border-slate-200 bg-slate-50 px-3 text-sm focus:bg-white dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>

                <div class="flex flex-col gap-2 pt-2">
                  <Button
                    type="submit"
                    variant="filledBlue"
                    class="h-8 w-full justify-center text-sm font-semibold"
                    disabled={state.isSubmitting()}
                  >
                    <Show when={state.isSubmitting()} fallback="Set Master Password">
                      Generating Keys & Securing Vault...
                    </Show>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    class="h-8 w-full justify-center text-sm font-semibold"
                    disabled={state.isSubmitting()}
                    onClick={state.setupCancel}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </Match>

          <Match when={state.status() === "error"}>
            <div class="space-y-4">
              <div class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 ring-8 ring-red-50/50 dark:bg-red-950/50 dark:text-red-400 dark:ring-red-950/30">
                <Icon path={vaultSvgIcons.shieldAlert} class="size-7 text-red-600 dark:text-red-400" />
              </div>
              <h1 class="font-bold text-2xl text-slate-900 tracking-tight dark:text-slate-50">
                SSO Authentication Failed
              </h1>
              <Show when={state.errorMessage()}>{(msg) => <AuthErrorFeedback message={msg} />}</Show>
              <div class="flex flex-col gap-2 pt-2">
                <Show when={state.isRetryable()}>
                  <Button
                    type="button"
                    variant="contrast"
                    class="h-8 w-full justify-center text-sm font-semibold"
                    onClick={state.retry}
                  >
                    Retry
                  </Button>
                </Show>
                <Button
                  type="button"
                  variant="outline"
                  class="h-8 w-full justify-center text-sm font-semibold"
                  onClick={state.navigateToLogin}
                >
                  <Icon path={vaultSvgIcons.arrowLeft} class="mr-1.5 size-3.5" />
                  Back to Login
                </Button>
              </div>
            </div>
          </Match>
        </Switch>
      </CardWrapper>
    </div>
  )
}
