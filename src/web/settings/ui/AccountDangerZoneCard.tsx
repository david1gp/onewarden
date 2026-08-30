import { type JSX, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import {
  type AccountDangerZoneCardProps,
  accountDangerZoneCardStateCreate,
} from "./accountDangerZoneCardStateCreate.js"

export function AccountDangerZoneCard(props: AccountDangerZoneCardProps): JSX.Element {
  const state = accountDangerZoneCardStateCreate(props)

  return (
    <CardWrapper class="overflow-hidden rounded-xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-900/60 dark:bg-slate-900">
      <div class="flex items-center gap-3 border-b border-red-100 pb-4 dark:border-red-950">
        <div class="flex size-10 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400">
          <Icon path={vaultSvgIcons.trash} class="size-5" />
        </div>
        <div>
          <h2 class="font-semibold text-base text-red-900 dark:text-red-200">Danger Zone</h2>
          <p class="text-sm text-red-600 dark:text-red-400">Irreversible and destructive account actions</p>
        </div>
      </div>

      <div class="mt-6 space-y-6">
        <div>
          <h3 class="font-semibold text-sm text-slate-900 dark:text-slate-100">Delete Account</h3>
          <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Permanently delete your account and all associated vault credentials, folders, and settings. This action
            cannot be undone.
          </p>
          <div class="mt-4 flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="h-8 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
              onClick={state.openDeleteDialog}
            >
              <Icon path={vaultSvgIcons.trash} class="mr-1.5 size-3.5" />
              Delete Account
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              class="h-8 text-sm text-slate-600 dark:text-slate-400"
              onClick={() => state.setIsRecoveryMode(!state.isRecoveryMode())}
            >
              <Icon path={vaultSvgIcons.email} class="mr-1.5 size-3.5" />
              {state.isRecoveryMode() ? "Hide Recovery Option" : "Request Deletion by Email"}
            </Button>
          </div>
        </div>

        <Show when={state.isDeleteDialogOpen()}>
          <div class="rounded-xl border border-red-300 bg-red-50/80 p-5 dark:border-red-900/80 dark:bg-red-950/40">
            <h4 class="font-bold text-sm text-red-900 dark:text-red-200">Confirm Account Deletion</h4>
            <p class="mt-1 text-sm text-red-800 dark:text-red-300">
              To confirm deletion, please type <strong>delete my account</strong> below and enter your master password.
            </p>

            <div class="mt-4 space-y-3 max-w-md">
              <div>
                <Label for="del-confirm-text" class="block text-sm font-medium text-red-900 dark:text-red-200">
                  Type "delete my account"
                </Label>
                <div class="mt-1">
                  <Input
                    id="del-confirm-text"
                    type="text"
                    placeholder="delete my account"
                    value={state.confirmationText()}
                    onInput={(e) => state.setConfirmationText(e.currentTarget.value)}
                    class="h-9 w-full rounded-md border-red-300 bg-white px-3 text-sm dark:border-red-800 dark:bg-slate-900"
                  />
                </div>
              </div>

              <div>
                <Label for="del-pwd" class="block text-sm font-medium text-red-900 dark:text-red-200">
                  Master Password
                </Label>
                <div class="mt-1">
                  <Input
                    id="del-pwd"
                    type="password"
                    placeholder="Master password"
                    value={state.masterPasswordInput()}
                    onInput={(e) => state.setMasterPasswordInput(e.currentTarget.value)}
                    class="h-9 w-full rounded-md border-red-300 bg-white px-3 text-sm dark:border-red-800 dark:bg-slate-900"
                  />
                </div>
              </div>

              <div>
                <Label for="del-otp" class="block text-sm font-medium text-red-900 dark:text-red-200">
                  Two-Factor OTP Code (Optional)
                </Label>
                <div class="mt-1">
                  <Input
                    id="del-otp"
                    type="text"
                    placeholder="6-digit OTP (if 2FA enabled)"
                    value={state.otpInput()}
                    onInput={(e) => state.setOtpInput(e.currentTarget.value)}
                    class="h-9 w-full rounded-md border-red-300 bg-white px-3 text-sm dark:border-red-800 dark:bg-slate-900"
                  />
                </div>
              </div>

              <div class="pt-2 flex items-center gap-3">
                <Button
                  type="button"
                  variant="filled"
                  size="sm"
                  class="h-9 bg-red-600 hover:bg-red-700 text-white text-sm"
                  onClick={state.handleDeleteAccount}
                  disabled={state.isDeleting()}
                >
                  <Icon path={vaultSvgIcons.trash} class="mr-1.5 size-3.5" />
                  {state.isDeleting() ? "Deleting..." : "Permanently Delete Account"}
                </Button>
                <Button type="button" variant="ghost" size="sm" class="h-9 text-sm" onClick={state.closeDeleteDialog}>
                  <Icon path={vaultSvgIcons.close} class="mr-1.5 size-3.5" />
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </Show>

        <Show when={state.isRecoveryMode()}>
          <form
            onSubmit={state.handleSendRecoveryDelete}
            class="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/40 max-w-md space-y-3"
          >
            <h4 class="font-semibold text-sm text-slate-900 dark:text-slate-100">Request Deletion Email</h4>
            <p class="text-sm text-slate-600 dark:text-slate-400">
              If you lost access to your master password, request an email with a deletion confirmation link.
            </p>
            <div>
              <Label for="rec-del-email" class="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Account Email
              </Label>
              <div class="mt-1">
                <Input
                  id="rec-del-email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={state.recoveryEmailInput()}
                  onInput={(e) => state.setRecoveryEmailInput(e.currentTarget.value)}
                  class="h-9 w-full rounded-md border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            </div>
            <div class="pt-1">
              <Button type="submit" variant="filled" size="sm" class="h-9 text-sm" disabled={state.isSendingRecovery()}>
                <Icon path={vaultSvgIcons.email} class="mr-1.5 size-3.5" />
                {state.isSendingRecovery() ? "Sending..." : "Send Deletion Link"}
              </Button>
            </div>
          </form>
        </Show>
      </div>
    </CardWrapper>
  )
}
