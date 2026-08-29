import { type JSX, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import { type AccountSecurityCardProps, accountSecurityCardStateCreate } from "./accountSecurityCardStateCreate.js"

export function AccountSecurityCard(props: AccountSecurityCardProps): JSX.Element {
  const state = accountSecurityCardStateCreate(props)

  return (
    <div class="space-y-6">
      <h2 class="font-semibold text-lg text-slate-900 dark:text-slate-100">Security &amp; KDF</h2>
      {/* Change Master Password */}
      <CardWrapper class="overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div class="flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
          <div class="flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
            <Icon path={vaultSvgIcons.lock} class="size-5" />
          </div>
          <div>
            <h2 class="font-semibold text-base text-slate-900 dark:text-slate-100">Change Master Password</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Update the password used to encrypt and unlock your vault
            </p>
          </div>
        </div>

        <form onSubmit={state.handleChangePassword} class="mt-6 max-w-md space-y-4">
          <div>
            <Label for="sec-current-pwd" class="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Current Master Password
            </Label>
            <div class="mt-1">
              <Input
                id="sec-current-pwd"
                type="password"
                placeholder="Current master password"
                value={state.currentPassword()}
                onInput={(e) => state.setCurrentPassword(e.currentTarget.value)}
                class="h-9 w-full rounded-md border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          <div>
            <Label for="sec-new-pwd" class="block text-xs font-medium text-slate-700 dark:text-slate-300">
              New Master Password
            </Label>
            <div class="mt-1">
              <Input
                id="sec-new-pwd"
                type="password"
                placeholder="New master password (min. 8 characters)"
                value={state.newPassword()}
                onInput={(e) => state.setNewPassword(e.currentTarget.value)}
                class="h-9 w-full rounded-md border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          <div>
            <Label for="sec-confirm-pwd" class="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Confirm New Master Password
            </Label>
            <div class="mt-1">
              <Input
                id="sec-confirm-pwd"
                type="password"
                placeholder="Confirm new master password"
                value={state.confirmPassword()}
                onInput={(e) => state.setConfirmPassword(e.currentTarget.value)}
                class="h-9 w-full rounded-md border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          <div>
            <Label for="sec-pwd-hint" class="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Master Password Hint (Optional)
            </Label>
            <div class="mt-1">
              <Input
                id="sec-pwd-hint"
                type="text"
                placeholder="A reminder to help you recall your password"
                value={state.passwordHint()}
                onInput={(e) => state.setPasswordHint(e.currentTarget.value)}
                class="h-9 w-full rounded-md border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          <div class="pt-2">
            <Button type="submit" variant="filled" size="sm" class="h-9 text-xs" disabled={state.isChangingPassword()}>
              {state.isChangingPassword() ? "Updating Password..." : "Change Master Password"}
            </Button>
          </div>
        </form>
      </CardWrapper>

      {/* KDF Settings */}
      <CardWrapper class="overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div class="flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
          <div class="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <Icon path={vaultSvgIcons.shieldCheck} class="size-5" />
          </div>
          <div>
            <h2 class="font-semibold text-base text-slate-900 dark:text-slate-100">Key Derivation Function (KDF)</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Configure the cryptographic hashing algorithm protecting your master key
            </p>
          </div>
        </div>

        <form onSubmit={state.handleChangeKdf} class="mt-6 max-w-md space-y-4">
          <div>
            <Label class="block text-xs font-medium text-slate-700 dark:text-slate-300">KDF Algorithm</Label>
            <div class="mt-1 flex gap-4">
              <label class="flex items-center gap-2 text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer">
                <input
                  type="radio"
                  name="kdfType"
                  value="0"
                  checked={state.kdfType() === 0}
                  onChange={() => state.setKdfType(0)}
                  class="text-blue-600 focus:ring-blue-500"
                />
                PBKDF2 SHA-256
              </label>
              <label class="flex items-center gap-2 text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer">
                <input
                  type="radio"
                  name="kdfType"
                  value="1"
                  checked={state.kdfType() === 1}
                  onChange={() => state.setKdfType(1)}
                  class="text-blue-600 focus:ring-blue-500"
                />
                Argon2id
              </label>
            </div>
          </div>

          <div>
            <Label for="kdf-iters" class="block text-xs font-medium text-slate-700 dark:text-slate-300">
              KDF Iterations {state.kdfType() === 0 ? "(recommended: 600,000)" : "(recommended: 3)"}
            </Label>
            <div class="mt-1">
              <Input
                id="kdf-iters"
                type="number"
                value={String(state.kdfIterations())}
                onInput={(e) => state.setKdfIterations(Number.parseInt(e.currentTarget.value, 10) || 0)}
                class="h-9 w-full rounded-md border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          <Show when={state.kdfType() === 1}>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <Label for="kdf-mem" class="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Memory (MB)
                </Label>
                <div class="mt-1">
                  <Input
                    id="kdf-mem"
                    type="number"
                    value={String(state.kdfMemory())}
                    onInput={(e) => state.setKdfMemory(Number.parseInt(e.currentTarget.value, 10) || 64)}
                    class="h-9 w-full rounded-md border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>
              <div>
                <Label for="kdf-par" class="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Parallelism
                </Label>
                <div class="mt-1">
                  <Input
                    id="kdf-par"
                    type="number"
                    value={String(state.kdfParallelism())}
                    onInput={(e) => state.setKdfParallelism(Number.parseInt(e.currentTarget.value, 10) || 4)}
                    class="h-9 w-full rounded-md border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>
            </div>
          </Show>

          <div>
            <Label for="kdf-pwd" class="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Master Password (required to save changes)
            </Label>
            <div class="mt-1">
              <Input
                id="kdf-pwd"
                type="password"
                placeholder="Enter master password"
                value={state.kdfMasterPassword()}
                onInput={(e) => state.setKdfMasterPassword(e.currentTarget.value)}
                class="h-9 w-full rounded-md border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
          </div>

          <div class="pt-2">
            <Button type="submit" variant="filled" size="sm" class="h-9 text-xs" disabled={state.isChangingKdf()}>
              {state.isChangingKdf() ? "Updating KDF..." : "Save KDF Settings"}
            </Button>
          </div>
        </form>
      </CardWrapper>

      {/* Rotate Account Keys & Deauthorize Sessions */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CardWrapper class="overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div class="flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
            <div class="flex size-10 items-center justify-center rounded-lg bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
              <Icon path={vaultSvgIcons.refresh} class="size-5" />
            </div>
            <div>
              <h2 class="font-semibold text-sm text-slate-900 dark:text-slate-100">Rotate Encryption Keys</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Generate new user encryption keys and RSA keypair
              </p>
            </div>
          </div>
          <p class="mt-4 text-xs text-slate-600 dark:text-slate-400">
            Rotating your account encryption keys generates a new 512-bit symmetric key and replaces your account
            keypair.
          </p>
          <div class="mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="text-xs text-amber-800 dark:text-amber-300"
              onClick={state.openRotateDialog}
            >
              Rotate Account Keys
            </Button>
          </div>

          <Show when={state.isRotateDialogOpen()}>
            <div class="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/60 dark:bg-amber-950/40">
              <h3 class="font-semibold text-xs text-amber-900 dark:text-amber-200">Confirm Key Rotation</h3>
              <p class="mt-1 text-[11px] text-amber-800 dark:text-amber-300">
                Enter your master password to rotate your encryption keys.
              </p>
              <div class="mt-3 flex items-center gap-2">
                <Input
                  type="password"
                  placeholder="Master password"
                  value={state.rotateMasterPassword()}
                  onInput={(e) => state.setRotateMasterPassword(e.currentTarget.value)}
                  class="h-8 w-full rounded-md border-amber-300 bg-white px-2.5 text-xs dark:border-amber-800 dark:bg-slate-900"
                />
                <Button
                  type="button"
                  variant="filled"
                  size="sm"
                  class="h-8 shrink-0 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={state.handleRotateKeys}
                  disabled={state.isRotatingKeys()}
                >
                  {state.isRotatingKeys() ? "Rotating..." : "Confirm"}
                </Button>
                <Button type="button" variant="ghost" size="sm" class="h-8 text-xs" onClick={state.closeRotateDialog}>
                  Cancel
                </Button>
              </div>
            </div>
          </Show>
        </CardWrapper>

        <CardWrapper class="overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div class="flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
            <div class="flex size-10 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400">
              <Icon path={vaultSvgIcons.server} class="size-5" />
            </div>
            <div>
              <h2 class="font-semibold text-sm text-slate-900 dark:text-slate-100">Deauthorize All Sessions</h2>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Log out all devices and active sessions immediately
              </p>
            </div>
          </div>
          <p class="mt-4 text-xs text-slate-600 dark:text-slate-400">
            Rotates your security stamp, invalidating all issued access and refresh tokens across all browsers, mobile
            apps, and extensions.
          </p>
          <div class="mt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              class="text-xs text-red-600 dark:text-red-400"
              onClick={state.openDeauthorizeDialog}
            >
              Deauthorize Sessions
            </Button>
          </div>

          <Show when={state.isDeauthorizeDialogOpen()}>
            <div class="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/40">
              <h3 class="font-semibold text-xs text-red-900 dark:text-red-200">Confirm Deauthorization</h3>
              <p class="mt-1 text-[11px] text-red-800 dark:text-red-300">
                Enter your master password to revoke all active tokens.
              </p>
              <div class="mt-3 flex items-center gap-2">
                <Input
                  type="password"
                  placeholder="Master password"
                  value={state.deauthorizePassword()}
                  onInput={(e) => state.setDeauthorizePassword(e.currentTarget.value)}
                  class="h-8 w-full rounded-md border-red-300 bg-white px-2.5 text-xs dark:border-red-800 dark:bg-slate-900"
                />
                <Button
                  type="button"
                  variant="filled"
                  size="sm"
                  class="h-8 shrink-0 text-xs bg-red-600 hover:bg-red-700 text-white"
                  onClick={state.handleDeauthorizeSessions}
                  disabled={state.isDeauthorizing()}
                >
                  {state.isDeauthorizing() ? "Revoking..." : "Deauthorize"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  class="h-8 text-xs"
                  onClick={state.closeDeauthorizeDialog}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Show>
        </CardWrapper>
      </div>
    </div>
  )
}
