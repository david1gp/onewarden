import { type JSX, Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { LinkTextExternal } from "#ui/interactive/link/LinkText.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { SeparatorWithText } from "#ui/static/separator/SeparatorWithText.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import { AuthErrorFeedback } from "./AuthErrorFeedback.jsx"
import { type AuthVerifyEmailViewProps, authVerifyEmailViewStateCreate } from "./authVerifyEmailViewStateCreate.js"

export function AuthVerifyEmailView(props: AuthVerifyEmailViewProps): JSX.Element {
  const state = authVerifyEmailViewStateCreate(props)

  return (
    <div class="flex min-h-[70dvh] flex-col items-center justify-center p-4">
      <CardWrapper class="w-full max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div class="text-center">
          <div class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-8 ring-blue-50/50 dark:bg-blue-950/50 dark:text-blue-400 dark:ring-blue-950/30">
            <Icon path={vaultSvgIcons.shieldCheck} class="size-7 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 class="mt-4 font-bold text-2xl text-slate-900 tracking-tight dark:text-slate-50">Verify Email Address</h1>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Confirm your account registration with your verification token.
          </p>
        </div>

        <Show when={state.errorMessage()}>{(msg) => <AuthErrorFeedback message={msg} />}</Show>

        <Show when={state.successMessage()}>
          {(msg) => (
            <div
              role="status"
              class="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
            >
              {msg()}
            </div>
          )}
        </Show>

        <form onSubmit={state.handleVerify} class="space-y-4">
          <div>
            <Label for="verify-user-id" class="block text-sm font-medium text-slate-700 dark:text-slate-300">
              User ID *
            </Label>
            <Input
              id="verify-user-id"
              type="text"
              placeholder="Your account UUID"
              value={state.userId()}
              onInput={(e) => state.setUserId(e.currentTarget.value)}
              required
              class="mt-1 h-9 w-full rounded-md border-slate-200 bg-slate-50 px-3 text-sm focus:bg-white dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div>
            <Label for="verify-token" class="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Verification Token *
            </Label>
            <Input
              id="verify-token"
              type="text"
              placeholder="Paste verification token from email"
              value={state.token()}
              onInput={(e) => state.setToken(e.currentTarget.value)}
              required
              class="mt-1 h-9 w-full rounded-md border-slate-200 bg-slate-50 px-3 text-sm focus:bg-white dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div class="pt-2">
            <Button
              type="submit"
              variant="filledBlue"
              class="h-8 w-full justify-center text-sm font-semibold"
              disabled={state.isSubmitting()}
            >
              <Icon path={vaultSvgIcons.check} class="mr-1.5 size-3.5" />
              <Show when={state.isSubmitting()} fallback="Confirm & Verify Email">
                Verifying Token...
              </Show>
            </Button>
          </div>
        </form>

        <SeparatorWithText>
          <span class="text-sm text-slate-600 dark:text-slate-400">Or Request a Verification Link</span>
        </SeparatorWithText>

        <div class="space-y-3">
          <div>
            <Label for="resend-email" class="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Account Email
            </Label>
            <Input
              id="resend-email"
              type="email"
              placeholder="user@example.com"
              value={state.resendEmail()}
              onInput={(e) => state.setResendEmail(e.currentTarget.value)}
              class="mt-1 h-9 w-full rounded-md border-slate-200 bg-slate-50 px-3 text-sm focus:bg-white dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            class="h-8 w-full justify-center text-sm"
            disabled={state.isResending()}
            onClick={state.handleResend}
          >
            <Icon path={vaultSvgIcons.email} class="mr-1.5 size-3.5" />
            <Show when={state.isResending()} fallback="Send Verification Email">
              Sending Email...
            </Show>
          </Button>
        </div>

        <div class="border-t border-slate-100 pt-4 text-center text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
          Ready to sign in?{" "}
          <LinkTextExternal href="/login" class="font-semibold">
            Return to Log In
          </LinkTextExternal>
        </div>
      </CardWrapper>
    </div>
  )
}
