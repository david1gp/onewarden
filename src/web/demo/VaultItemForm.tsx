import { For, type JSX, Show } from "solid-js"
import { Checkbox } from "#ui/input/check/Checkbox.jsx"
import { classesInput } from "#ui/input/input/classesInput.js"
import { Input } from "#ui/input/input/Input.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { LabelAsterix } from "#ui/input/label/LabelAsterix.jsx"
import { Textarea } from "#ui/input/textarea/Textarea.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ButtonIconOnly } from "#ui/interactive/button/ButtonIconOnly.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { classesScrollbar } from "#ui/static/scrollbar/classesScrollbar.js"
import { type VaultItemFormProps, vaultItemFormStateCreate } from "./vaultItemFormStateCreate.js"
import { vaultSvgIcons } from "./vaultSvgIcons.js"

const mdiDelete = "M19 4h-3.5l-1-1h-5l-1 1H5v2h14V4zM6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12z"

export function VaultItemForm(props: VaultItemFormProps): JSX.Element {
  const state = vaultItemFormStateCreate(props)

  return (
    <article class="flex h-full min-w-0 flex-col bg-slate-50/50 text-slate-800 dark:bg-slate-950/40 dark:text-slate-200">
      <div class={`flex-1 overflow-y-auto ${classesScrollbar} p-4 sm:p-6`}>
        {/* Form Header */}
        <div class="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
          <div>
            <h2 class="font-bold text-lg text-slate-900 tracking-tight dark:text-slate-50">
              {state.mode === "add" ? "New Vault Item" : "Edit Item"}
            </h2>
            <p class="text-xs text-slate-600 dark:text-slate-400">
              {state.mode === "add"
                ? "Add a new credential or secret to your vault."
                : "Modify credential details, ownership, or custom fields."}
            </p>
          </div>

          <div class="flex items-center gap-2">
            <Button variant="ghost" size="sm" class="text-xs" onClick={state.cancel}>
              Cancel
            </Button>
            <Button
              variant="filled"
              size="sm"
              class="bg-blue-600 text-xs text-white hover:bg-blue-700"
              onClick={state.save}
            >
              Save Item
            </Button>
          </div>
        </div>

        {/* Validation Error Banner */}
        <Show when={state.validationError()}>
          <div class="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300">
            <Icon path={vaultSvgIcons.shieldAlert} class="size-4 shrink-0 text-red-600" />
            <span>{state.validationError()}</span>
          </div>
        </Show>

        <div class="max-w-3xl space-y-5">
          {/* Section: Item Type & Ownership */}
          <CardWrapper class="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h3 class="font-semibold text-slate-900 text-xs dark:text-slate-100 uppercase tracking-wider">
              Type &amp; Ownership
            </h3>

            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Category / Type Selector */}
              <div>
                <Label for="item-category" class="mb-1 block font-medium text-xs">
                  Type <LabelAsterix />
                </Label>
                <select
                  id="item-category"
                  class={`${classesInput} text-xs`}
                  value={state.category()}
                  onChange={(e) =>
                    state.setCategory(
                      e.currentTarget.value as "login" | "secureNote" | "creditCard" | "identity" | "sshKey",
                    )
                  }
                >
                  <option value="login">Login</option>
                  <option value="secureNote">Secure Note</option>
                  <option value="creditCard">Card</option>
                  <option value="identity">Identity</option>
                  <option value="sshKey">SSH Key</option>
                </select>
              </div>

              {/* Ownership Selector */}
              <div>
                <Label for="item-ownership" class="mb-1 block font-medium text-xs">
                  Ownership <LabelAsterix />
                </Label>
                <select
                  id="item-ownership"
                  class={`${classesInput} text-xs`}
                  value={state.ownership()}
                  onChange={(e) => state.setOwnership(e.currentTarget.value as "personal" | "organization")}
                >
                  <option value="personal">Personal Vault</option>
                  <option value="organization">Acme Corporation (Organization)</option>
                </select>
              </div>
            </div>

            {/* Organization Collections (Required when Ownership is Organization) */}
            <Show when={state.ownership() === "organization"}>
              <div class="rounded-md border border-indigo-100 bg-indigo-50/50 p-3 dark:border-indigo-950/60 dark:bg-indigo-950/20">
                <Label class="mb-1.5 block font-medium text-xs text-indigo-950 dark:text-indigo-200">
                  Collections <LabelAsterix />
                </Label>
                <p class="mb-2 text-[11px] text-slate-600 dark:text-slate-400">
                  Organization items must belong to at least one collection.
                </p>
                <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <For each={state.availableCollections}>
                    {(col) => (
                      <Checkbox
                        id={`col-${col.id}`}
                        checked={state.collectionIds().includes(col.id)}
                        onChange={() => state.toggleCollection(col.id)}
                        class="text-xs"
                      >
                        <span class="text-xs text-slate-800 dark:text-slate-200">{col.name}</span>
                      </Checkbox>
                    )}
                  </For>
                </div>
              </div>
            </Show>
          </CardWrapper>

          {/* Section: Primary Metadata */}
          <CardWrapper class="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h3 class="font-semibold text-slate-900 text-xs dark:text-slate-100 uppercase tracking-wider">
              Item Information
            </h3>

            {/* Name / Title */}
            <div>
              <Label for="item-title" class="mb-1 block font-medium text-xs">
                Name <LabelAsterix />
              </Label>
              <Input
                id="item-title"
                type="text"
                placeholder="e.g. GitHub Enterprise, Personal Visa"
                value={state.title()}
                onInput={(e) => state.setTitle(e.currentTarget.value)}
                class="text-xs"
              />
            </div>

            {/* Folder & Favorite (Favorite only when Personal) */}
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label for="item-folder" class="mb-1 block font-medium text-xs">
                  Folder
                </Label>
                <select
                  id="item-folder"
                  class={`${classesInput} text-xs`}
                  value={state.folder()}
                  onChange={(e) => state.setFolder(e.currentTarget.value)}
                >
                  <option value="">(None)</option>
                  <For each={state.availableFolders()}>
                    {(folderName) => <option value={folderName}>{folderName}</option>}
                  </For>
                </select>
              </div>

              <Show when={state.ownership() === "personal"}>
                <div class="flex items-center pt-6">
                  <Checkbox
                    id="item-favorite"
                    checked={state.favorite()}
                    onChange={(checked) => state.setFavorite(checked)}
                    class="text-xs"
                  >
                    <span class="inline-flex items-center gap-1 text-xs text-slate-800 dark:text-slate-200">
                      <Icon path={vaultSvgIcons.star} class="size-3.5 text-amber-500" />
                      Add to Favorites
                    </span>
                  </Checkbox>
                </div>
              </Show>
            </div>
          </CardWrapper>

          {/* Section: Category Specific Details */}
          <Show when={state.category() === "login"}>
            <CardWrapper class="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <h3 class="font-semibold text-slate-900 text-xs dark:text-slate-100 uppercase tracking-wider">
                Login Credentials
              </h3>

              <div>
                <Label for="login-username" class="mb-1 block font-medium text-xs">
                  Username
                </Label>
                <Input
                  id="login-username"
                  type="text"
                  placeholder="username or email"
                  value={state.username()}
                  onInput={(e) => state.setUsername(e.currentTarget.value)}
                  class="text-xs"
                />
              </div>

              <div>
                <Label for="login-password" class="mb-1 block font-medium text-xs">
                  Password
                </Label>
                <div class="relative flex items-center">
                  <Input
                    id="login-password"
                    type={state.isPasswordRevealed() ? "text" : "password"}
                    placeholder="password"
                    value={state.password()}
                    onInput={(e) => state.setPassword(e.currentTarget.value)}
                    class="pr-9 text-xs font-mono"
                  />
                  <ButtonIconOnly
                    variant="ghost"
                    size="none"
                    title={state.isPasswordRevealed() ? "Hide password" : "Show password"}
                    aria-label={state.isPasswordRevealed() ? "Hide password" : "Show password"}
                    icon={state.isPasswordRevealed() ? vaultSvgIcons.eyeOff : vaultSvgIcons.eye}
                    iconClass="size-4 text-slate-500 fill-current dark:fill-current"
                    onClick={state.togglePasswordReveal}
                    class="absolute right-2 size-6"
                  />
                </div>
              </div>

              <div>
                <Label for="login-totp" class="mb-1 block font-medium text-xs">
                  Authenticator Key (TOTP)
                </Label>
                <Input
                  id="login-totp"
                  type="text"
                  placeholder="TOTP seed key or token"
                  value={state.totp()}
                  onInput={(e) => state.setTotp(e.currentTarget.value)}
                  class="text-xs font-mono"
                />
              </div>

              <div>
                <Label for="login-url" class="mb-1 block font-medium text-xs">
                  Website URL
                </Label>
                <Input
                  id="login-url"
                  type="url"
                  placeholder="https://example.com/login"
                  value={state.url()}
                  onInput={(e) => state.setUrl(e.currentTarget.value)}
                  class="text-xs"
                />
              </div>
            </CardWrapper>
          </Show>

          <Show when={state.category() === "creditCard"}>
            <CardWrapper class="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <h3 class="font-semibold text-slate-900 text-xs dark:text-slate-100 uppercase tracking-wider">
                Card Information
              </h3>

              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label for="card-holder" class="mb-1 block font-medium text-xs">
                    Cardholder Name
                  </Label>
                  <Input
                    id="card-holder"
                    type="text"
                    placeholder="Full name on card"
                    value={state.cardholderName()}
                    onInput={(e) => state.setCardholderName(e.currentTarget.value)}
                    class="text-xs"
                  />
                </div>

                <div>
                  <Label for="card-number" class="mb-1 block font-medium text-xs">
                    Card Number
                  </Label>
                  <Input
                    id="card-number"
                    type="text"
                    placeholder="4111 2222 3333 4444"
                    value={state.cardNumber()}
                    onInput={(e) => state.setCardNumber(e.currentTarget.value)}
                    class="text-xs font-mono"
                  />
                </div>

                <div>
                  <Label for="card-expiration" class="mb-1 block font-medium text-xs">
                    Expiration (MM/YY)
                  </Label>
                  <Input
                    id="card-expiration"
                    type="text"
                    placeholder="12/28"
                    value={state.cardExpiration()}
                    onInput={(e) => state.setCardExpiration(e.currentTarget.value)}
                    class="text-xs font-mono"
                  />
                </div>

                <div>
                  <Label for="card-cvv" class="mb-1 block font-medium text-xs">
                    Security Code (CVV)
                  </Label>
                  <Input
                    id="card-cvv"
                    type="password"
                    placeholder="123"
                    value={state.cardCvv()}
                    onInput={(e) => state.setCardCvv(e.currentTarget.value)}
                    class="text-xs font-mono"
                  />
                </div>
              </div>
            </CardWrapper>
          </Show>

          <Show when={state.category() === "identity"}>
            <CardWrapper class="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <h3 class="font-semibold text-slate-900 text-xs dark:text-slate-100 uppercase tracking-wider">
                Identity Profile
              </h3>

              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label for="id-fullname" class="mb-1 block font-medium text-xs">
                    Full Name
                  </Label>
                  <Input
                    id="id-fullname"
                    type="text"
                    placeholder="First and last name"
                    value={state.identityFullName()}
                    onInput={(e) => state.setIdentityFullName(e.currentTarget.value)}
                    class="text-xs"
                  />
                </div>

                <div>
                  <Label for="id-title" class="mb-1 block font-medium text-xs">
                    Title / Role
                  </Label>
                  <Input
                    id="id-title"
                    type="text"
                    placeholder="Systems Architect, etc."
                    value={state.identityTitle()}
                    onInput={(e) => state.setIdentityTitle(e.currentTarget.value)}
                    class="text-xs"
                  />
                </div>

                <div>
                  <Label for="id-employee-id" class="mb-1 block font-medium text-xs">
                    ID / Employee / Passport Number
                  </Label>
                  <Input
                    id="id-employee-id"
                    type="text"
                    placeholder="ACME-EMP-8841"
                    value={state.identityEmployeeId()}
                    onInput={(e) => state.setIdentityEmployeeId(e.currentTarget.value)}
                    class="text-xs font-mono"
                  />
                </div>

                <div>
                  <Label for="id-email" class="mb-1 block font-medium text-xs">
                    Email
                  </Label>
                  <Input
                    id="id-email"
                    type="email"
                    placeholder="user@example.com"
                    value={state.identityEmail()}
                    onInput={(e) => state.setIdentityEmail(e.currentTarget.value)}
                    class="text-xs"
                  />
                </div>

                <div>
                  <Label for="id-phone" class="mb-1 block font-medium text-xs">
                    Phone
                  </Label>
                  <Input
                    id="id-phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={state.identityPhone()}
                    onInput={(e) => state.setIdentityPhone(e.currentTarget.value)}
                    class="text-xs"
                  />
                </div>

                <div>
                  <Label for="id-department" class="mb-1 block font-medium text-xs">
                    Department / Nationality
                  </Label>
                  <Input
                    id="id-department"
                    type="text"
                    placeholder="Engineering / United States"
                    value={state.identityDepartment()}
                    onInput={(e) => state.setIdentityDepartment(e.currentTarget.value)}
                    class="text-xs"
                  />
                </div>
              </div>
            </CardWrapper>
          </Show>

          <Show when={state.category() === "sshKey"}>
            <CardWrapper class="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
              <h3 class="font-semibold text-slate-900 text-xs dark:text-slate-100 uppercase tracking-wider">
                SSH Key Details
              </h3>

              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label for="ssh-username" class="mb-1 block font-medium text-xs">
                    Username
                  </Label>
                  <Input
                    id="ssh-username"
                    type="text"
                    placeholder="ec2-user, root, etc."
                    value={state.username()}
                    onInput={(e) => state.setUsername(e.currentTarget.value)}
                    class="text-xs font-mono"
                  />
                </div>

                <div>
                  <Label for="ssh-url" class="mb-1 block font-medium text-xs">
                    Host / Server URL
                  </Label>
                  <Input
                    id="ssh-url"
                    type="text"
                    placeholder="ssh://bastion.example.com:2222"
                    value={state.url()}
                    onInput={(e) => state.setUrl(e.currentTarget.value)}
                    class="text-xs font-mono"
                  />
                </div>

                <div>
                  <Label for="ssh-type" class="mb-1 block font-medium text-xs">
                    Key Type
                  </Label>
                  <Input
                    id="ssh-type"
                    type="text"
                    placeholder="Ed25519 or RSA"
                    value={state.sshKeyType()}
                    onInput={(e) => state.setSshKeyType(e.currentTarget.value)}
                    class="text-xs font-mono"
                  />
                </div>

                <div>
                  <Label for="ssh-fingerprint" class="mb-1 block font-medium text-xs">
                    Fingerprint
                  </Label>
                  <Input
                    id="ssh-fingerprint"
                    type="text"
                    placeholder="SHA256:..."
                    value={state.sshFingerprint()}
                    onInput={(e) => state.setSshFingerprint(e.currentTarget.value)}
                    class="text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <Label for="ssh-passphrase" class="mb-1 block font-medium text-xs">
                  Passphrase
                </Label>
                <Input
                  id="ssh-passphrase"
                  type="password"
                  placeholder="Key passphrase"
                  value={state.sshPassphrase()}
                  onInput={(e) => state.setSshPassphrase(e.currentTarget.value)}
                  class="text-xs font-mono"
                />
              </div>

              <div>
                <Label for="ssh-publickey" class="mb-1 block font-medium text-xs">
                  Public Key
                </Label>
                <Textarea
                  id="ssh-publickey"
                  rows={3}
                  placeholder="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5..."
                  value={state.sshPublicKey()}
                  onInput={(e) => state.setSshPublicKey(e.currentTarget.value)}
                  class="text-xs font-mono"
                />
              </div>
            </CardWrapper>
          </Show>

          {/* Section: Secure Notes */}
          <CardWrapper class="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <h3 class="font-semibold text-slate-900 text-xs dark:text-slate-100 uppercase tracking-wider">Notes</h3>
            <Textarea
              id="item-notes"
              rows={4}
              placeholder="Additional secure notes, recovery instructions, etc."
              value={state.notes()}
              onInput={(e) => state.setNotes(e.currentTarget.value)}
              class="text-xs font-mono"
            />
          </CardWrapper>

          {/* Section: Custom Fields */}
          <CardWrapper class="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-slate-900 text-xs dark:text-slate-100 uppercase tracking-wider">
                Custom Fields
              </h3>
              <Button
                variant="ghost"
                size="sm"
                class="text-xs text-blue-600 dark:text-blue-400"
                onClick={state.addCustomField}
              >
                + Add Custom Field
              </Button>
            </div>

            <Show
              when={state.extraCustomFields().length > 0}
              fallback={
                <p class="text-xs text-slate-600 dark:text-slate-400">No additional custom fields configured.</p>
              }
            >
              <div class="space-y-3">
                <For each={state.extraCustomFields()}>
                  {(field, idx) => (
                    <div class="flex flex-wrap items-center gap-2 rounded-md border border-slate-100 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-slate-800/40">
                      <div class="min-w-36 flex-1">
                        <Input
                          type="text"
                          placeholder="Field Name"
                          value={field.label}
                          onInput={(e) =>
                            state.updateCustomField(idx(), {
                              label: e.currentTarget.value,
                            })
                          }
                          class="h-8 text-xs"
                        />
                      </div>
                      <div class="min-w-44 flex-1">
                        <Input
                          type={field.concealed ? "password" : "text"}
                          placeholder="Field Value"
                          value={field.value}
                          onInput={(e) =>
                            state.updateCustomField(idx(), {
                              value: e.currentTarget.value,
                            })
                          }
                          class="h-8 text-xs font-mono"
                        />
                      </div>
                      <Checkbox
                        id={`custom-concealed-${idx()}`}
                        checked={Boolean(field.concealed)}
                        onChange={(checked) => state.updateCustomField(idx(), { concealed: checked })}
                        class="text-xs"
                      >
                        <span class="text-[11px] text-slate-600 dark:text-slate-400">Hidden</span>
                      </Checkbox>
                      <ButtonIconOnly
                        variant="ghost"
                        size="none"
                        title="Delete field"
                        aria-label="Delete field"
                        icon={mdiDelete}
                        iconClass="size-4 text-red-500 fill-current dark:fill-current"
                        onClick={() => state.removeCustomField(idx())}
                        class="size-7"
                      />
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </CardWrapper>

          {/* Form Bottom Actions */}
          <div class="flex items-center justify-end gap-2 pt-2 pb-6">
            <Button variant="ghost" size="sm" class="text-xs" onClick={state.cancel}>
              Cancel
            </Button>
            <Button
              variant="filled"
              size="sm"
              class="bg-blue-600 text-xs text-white hover:bg-blue-700"
              onClick={state.save}
            >
              Save Item
            </Button>
          </div>
        </div>
      </div>
    </article>
  )
}
