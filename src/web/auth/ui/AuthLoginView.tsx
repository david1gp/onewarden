import { type JSX, Show } from "solid-js"
import { Checkbox } from "#ui/input/check/Checkbox.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ButtonIcon } from "#ui/interactive/button/ButtonIcon.jsx"
import { LinkTextExternal } from "#ui/interactive/link/LinkText.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import { AuthErrorFeedback } from "./AuthErrorFeedback.jsx"
import { AuthTwoFactorChallengeCard } from "./AuthTwoFactorChallengeCard.jsx"
import { type AuthLoginViewProps, authLoginViewStateCreate } from "./authLoginViewStateCreate.js"

export function AuthLoginView(props: AuthLoginViewProps): JSX.Element {
  const state = authLoginViewStateCreate(props)

  return (
    <div class="flex min-h-[70dvh] flex-col items-center justify-center p-4">
      <Show
        when={!state.requiresTwoFactor()}
        fallback={
          <AuthTwoFactorChallengeCard
            session={state.session}
            onSuccess={props.onSuccess}
            onCancel={state.handleTwoFactorCancel}
          />
        }
      >
        <CardWrapper class="w-full max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
          <div class="text-center">
            <div class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-8 ring-blue-50/50 dark:bg-blue-950/50 dark:text-blue-400 dark:ring-blue-950/30">
              <Icon path={vaultSvgIcons.shieldCheck} class="size-7 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 class="mt-4 font-bold text-2xl text-slate-900 tracking-tight dark:text-slate-50">
              Log In to OneWarden
            </h1>
            <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Access your secure encrypted password vault from any device.
            </p>
          </div>

          <Show when={state.errorMessage()}>{(msg) => <AuthErrorFeedback message={msg} />}</Show>

          <form onSubmit={state.handleSubmit} class="space-y-4">
            <div>
              <Label for="login-email" class="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Email Address
              </Label>
              <Input
                id="login-email"
                type="email"
                autocomplete="username"
                placeholder="user@example.com"
                value={state.email()}
                onInput={(e) => state.setEmail(e.currentTarget.value)}
                required
                class="mt-1 h-9 w-full rounded-md border-slate-200 bg-slate-50 px-3 text-sm focus:bg-white dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            <div>
              <div class="flex items-center justify-between">
                <Label for="login-password" class="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Master Password
                </Label>
              </div>
              <div class="relative mt-1">
                <Input
                  id="login-password"
                  type={state.showPassword() ? "text" : "password"}
                  autocomplete="current-password"
                  placeholder="Enter master password"
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

            <div class="flex items-center justify-between pt-1">
              <Checkbox id="remember-email" checked={state.rememberEmail()} onChange={state.setRememberEmail}>
                <span class="select-none text-sm text-slate-600 dark:text-slate-400">Remember email</span>
              </Checkbox>
            </div>

            <div class="pt-2">
              <Button
                type="submit"
                variant="filledBlue"
                class="h-8 w-full justify-center text-sm font-semibold"
                disabled={state.isSubmitting()}
              >
                <Icon path={vaultSvgIcons.lock} class="mr-1.5 size-3.5" />
                <Show when={state.isSubmitting()} fallback="Log In">
                  Signing In & Decrypting...
                </Show>
              </Button>
            </div>
          </form>

          <div class="flex flex-col gap-2 border-t border-slate-100 pt-4 text-center text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
            <div>
              Don't have an account?{" "}
              <LinkTextExternal href="/register" class="font-semibold">
                Create Account
              </LinkTextExternal>
            </div>
            <div>
              Need email verification? <LinkTextExternal href="/verify-email">Verify Email Address</LinkTextExternal>
            </div>
          </div>
        </CardWrapper>
      </Show>
    </div>
  )
}
