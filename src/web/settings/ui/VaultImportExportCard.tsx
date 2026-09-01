import { For, type JSX, Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { SelectSingleNative } from "#ui/input/select/SelectSingleNative.jsx"
import { Textarea } from "#ui/input/textarea/Textarea.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import type { VaultExportFormat } from "../model/vaultExportSchema.js"
import {
  type VaultImportExportCardProps,
  vaultImportExportCardStateCreate,
} from "./vaultImportExportCardStateCreate.js"

const exportFormatLabels: Record<VaultExportFormat, string> = {
  "json-decrypted": "Unencrypted JSON (.json)",
  "csv-decrypted": "Unencrypted CSV (.csv)",
  "json-encrypted": "Password-protected JSON (.json)",
  "json-account-encrypted": "Account-restricted JSON (.json)",
  zip: "JSON with attachments (.zip)",
}

const exportFormatPersonalDescriptions: Record<VaultExportFormat, string> = {
  "json-decrypted": "Bitwarden-compatible JSON containing all supported item types and folders, in plain text.",
  "csv-decrypted": "Bitwarden-compatible CSV containing logins and secure notes only, in plain text.",
  "json-encrypted":
    "Portable encrypted export. It can be imported into any account with the file password you choose below.",
  "json-account-encrypted":
    "Account-restricted encrypted export. It stays bound to this account and can only be imported here again, so it is not portable.",
  zip: "Bitwarden-compatible ZIP containing the unencrypted JSON export plus your attachment files as plain, decrypted binaries.",
}

const exportFormatOrganizationDescriptions: Record<VaultExportFormat, string> = {
  "json-decrypted": "Decrypted organization JSON containing organization items and their collection assignments.",
  "csv-decrypted": "Decrypted organization CSV containing logins and secure notes with their collection names only.",
  "json-encrypted": "",
  "json-account-encrypted": "",
  zip: "",
}

export function VaultImportExportCard(props: VaultImportExportCardProps): JSX.Element {
  const state = vaultImportExportCardStateCreate(props)

  return (
    <CardWrapper class="overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div class="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
        <div class="flex items-center gap-3">
          <div class="flex size-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400">
            <Icon path={vaultSvgIcons.refresh} class="size-5" />
          </div>
          <div>
            <h2 class="font-semibold text-base text-slate-900 dark:text-slate-100">Import &amp; Export</h2>
            <p class="text-sm text-slate-500 dark:text-slate-400">
              Backup, transfer, or restore your vault credentials
            </p>
          </div>
        </div>
        <div class="inline-flex rounded-lg bg-slate-100 p-0.5 text-sm dark:bg-slate-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={state.subTab() === "import"}
            class={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              state.subTab() === "import"
                ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                : "text-slate-600 dark:text-slate-400"
            }`}
            onClick={() => state.setSubTab("import")}
          >
            Import Vault
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={state.subTab() === "export"}
            class={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
              state.subTab() === "export"
                ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                : "text-slate-600 dark:text-slate-400"
            }`}
            onClick={() => state.setSubTab("export")}
          >
            Export Vault
          </Button>
        </div>
      </div>

      <Show when={state.subTab() === "import"}>
        <form onSubmit={state.handleImport} class="mt-6 max-w-xl space-y-4">
          <div class="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-300">
            Importing is additive: the records in the file are added to your vault. Existing items and folders are never
            replaced or deleted, so importing the same file twice creates duplicates.
          </div>

          <div>
            <Label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Import Into</Label>
            <div class="mt-1 flex gap-4">
              <Button
                type="button"
                size="sm"
                variant={state.importScope() === "personal" ? "filled" : "outline"}
                onClick={() => state.setImportScope("personal")}
                aria-pressed={state.importScope() === "personal"}
              >
                My Vault
              </Button>
              <Button
                type="button"
                size="sm"
                variant={state.importScope() === "organization" ? "filled" : "outline"}
                onClick={() => state.setImportScope("organization")}
                aria-pressed={state.importScope() === "organization"}
              >
                An Organization
              </Button>
            </div>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {state.importScope() === "organization"
                ? "Items are added to the selected organization and its collections. You need a membership that may write to the target collections."
                : "Items and folders are added to your personal vault."}
            </p>
          </div>

          <Show when={state.importScope() === "organization"}>
            <div>
              <Label for="import-organization" class="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Organization
              </Label>
              <Show
                when={!state.isLoadingOrganizations()}
                fallback={
                  <p role="status" class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Loading organizations...
                  </p>
                }
              >
                <Show
                  when={state.organizations().length > 0}
                  fallback={
                    <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      No organizations are available for this account.
                    </p>
                  }
                >
                  <SelectSingleNative
                    id="import-organization"
                    class="mt-1"
                    disabled={state.isImporting()}
                    valueSignal={{
                      get: () => state.organizationId() ?? "",
                      set: (id: string) => state.setOrganizationId(id),
                    }}
                    getOptions={() => state.organizations().map((organization) => organization.id)}
                    valueText={(id) => state.organizations().find((o) => o.id === id)?.name ?? id}
                  />
                </Show>
              </Show>
            </div>
          </Show>

          <div>
            <Label class="block text-sm font-medium text-slate-700 dark:text-slate-300">File Format</Label>
            <div class="mt-1 flex gap-4">
              <Button
                type="button"
                size="sm"
                variant={state.importFormat() === "json" ? "filled" : "outline"}
                onClick={() => state.setImportFormat("json")}
                aria-pressed={state.importFormat() === "json"}
              >
                Bitwarden JSON (.json)
              </Button>
              <Button
                type="button"
                size="sm"
                variant={state.importFormat() === "csv" ? "filled" : "outline"}
                onClick={() => state.setImportFormat("csv")}
                aria-pressed={state.importFormat() === "csv"}
              >
                Bitwarden CSV (.csv)
              </Button>
            </div>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {state.importScope() === "organization"
                ? state.importFormat() === "json"
                  ? "Accepts a decrypted organization JSON export. Collections in the file are created in the selected organization when they are missing."
                  : "Accepts a decrypted organization CSV export. It only carries logins and secure notes with their collection names."
                : state.importFormat() === "json"
                  ? "Accepts an unencrypted Bitwarden JSON export, a password-protected (portable) JSON export, or an account-restricted export created by this account. The file type is detected automatically."
                  : "Bitwarden CSV only carries logins and secure notes; cards, identities, extra URIs, and password history are not present in the file."}
            </p>
            <Show when={state.importScope() === "personal" && state.importFormat() === "json"}>
              <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Account-restricted exports are bound to the account that created them: unlock this vault to import them
                and leave the file password empty.
              </p>
            </Show>
          </div>

          <div>
            <Label for="import-file" class="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Select File to Import
            </Label>
            <div class="mt-1">
              <input
                id="import-file"
                type="file"
                accept=".json,.csv,application/json,text/csv"
                disabled={state.isImporting()}
                onChange={state.handleFileUpload}
                class="block w-full text-sm text-slate-500 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200 dark:file:bg-slate-800 dark:file:text-slate-300"
              />
            </div>
            <Show when={state.importFileName()}>
              {(name) => <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">Loaded file: {name()}</p>}
            </Show>
          </div>

          <Show when={state.importScope() === "personal" && state.importFormat() === "json"}>
            <div>
              <Label for="import-file-password" class="block text-sm font-medium text-slate-700 dark:text-slate-300">
                File Password (password-protected JSON only)
              </Label>
              <Input
                id="import-file-password"
                type="password"
                autocomplete="off"
                disabled={state.isImporting()}
                value={state.importFilePassword()}
                onInput={(event) => state.setImportFilePassword(event.currentTarget.value)}
                class="mt-1 w-full"
              />
              <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                This is the password that was set when the export file was created, not your account master password.
              </p>
            </div>
          </Show>

          <Show when={state.importScope() === "personal"}>
            <div>
              <Label for="import-master-password" class="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Master Password (only needed while the vault is locked)
              </Label>
              <Input
                id="import-master-password"
                type="password"
                autocomplete="current-password"
                disabled={state.isImporting()}
                value={state.importMasterPassword()}
                onInput={(event) => state.setImportMasterPassword(event.currentTarget.value)}
                class="mt-1 w-full"
              />
            </div>
          </Show>

          <Show when={state.importScope() === "organization"}>
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Organization imports use the organization key of your unlocked vault, so no file or master password is
              needed here.
            </p>
          </Show>

          <div>
            <Label for="import-paste" class="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Or Paste Vault Data
            </Label>
            <div class="mt-1">
              <Textarea
                id="import-paste"
                placeholder="Paste JSON or CSV content here..."
                rows={6}
                disabled={state.isImporting()}
                value={state.importContent()}
                onInput={(e) => state.setImportContent(e.currentTarget.value)}
                class="w-full font-mono text-sm"
              />
            </div>
          </div>

          <Show when={state.importValidationMessage()}>
            {(message) => (
              <div
                role="alert"
                class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
              >
                {message()}
              </div>
            )}
          </Show>

          <Show when={state.importSummary()}>
            {(summary) => (
              <div
                role="status"
                class="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
              >
                <p class="font-medium">Import complete</p>
                <ul class="mt-1 list-disc pl-5">
                  <li>{summary().cipherCount} items added</li>
                  <Show
                    when={state.importScope() === "organization"}
                    fallback={<li>{summary().folderCount} folders assigned</li>}
                  >
                    <li>{summary().collectionCount} collections assigned</li>
                  </Show>
                </ul>
                <Show when={summary().warnings.length > 0}>
                  <p class="mt-2 font-medium">Warnings</p>
                  <ul class="mt-1 list-disc pl-5">
                    <For each={summary().warnings}>{(warning) => <li>{warning}</li>}</For>
                  </ul>
                </Show>
              </div>
            )}
          </Show>

          <div class="pt-2">
            <Button
              type="submit"
              variant="filled"
              size="sm"
              class="h-9 text-sm"
              disabled={!state.canSubmitImport()}
              aria-busy={state.isImporting()}
            >
              <Icon path={vaultSvgIcons.download} class="mr-1.5 size-3.5" />
              {state.isImporting() ? "Importing Vault..." : "Import Vault"}
            </Button>
          </div>
        </form>
      </Show>

      <Show when={state.subTab() === "export"}>
        <form onSubmit={state.handleExport} class="mt-6 max-w-xl space-y-4">
          <div>
            <Label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Export From</Label>
            <div class="mt-1 flex gap-4">
              <Button
                type="button"
                size="sm"
                variant={state.exportScope() === "personal" ? "filled" : "outline"}
                onClick={() => state.setExportScope("personal")}
                aria-pressed={state.exportScope() === "personal"}
              >
                My Vault
              </Button>
              <Button
                type="button"
                size="sm"
                variant={state.exportScope() === "organization" ? "filled" : "outline"}
                onClick={() => state.setExportScope("organization")}
                aria-pressed={state.exportScope() === "organization"}
              >
                An Organization
              </Button>
            </div>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {state.exportScope() === "organization"
                ? "Exports the active items of the selected organization with their collections. Organization administration rights are required."
                : "Exports your personal vault only; organization-owned and trashed items are excluded."}
            </p>
          </div>

          <Show when={state.exportScope() === "organization"}>
            <div>
              <Label for="export-organization" class="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Organization
              </Label>
              <Show
                when={!state.isLoadingOrganizations()}
                fallback={
                  <p role="status" class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Loading organizations...
                  </p>
                }
              >
                <Show
                  when={state.organizations().length > 0}
                  fallback={
                    <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      No organizations are available for this account.
                    </p>
                  }
                >
                  <SelectSingleNative
                    id="export-organization"
                    class="mt-1"
                    disabled={state.isExporting()}
                    valueSignal={{
                      get: () => state.organizationId() ?? "",
                      set: (id: string) => state.setOrganizationId(id),
                    }}
                    getOptions={() => state.organizations().map((organization) => organization.id)}
                    valueText={(id) => state.organizations().find((o) => o.id === id)?.name ?? id}
                  />
                </Show>
              </Show>
            </div>
          </Show>

          <div>
            <Label class="block text-sm font-medium text-slate-700 dark:text-slate-300">Export Format</Label>
            <div class="mt-1 flex flex-wrap gap-4">
              <For each={state.exportFormatOptions()}>
                {(format) => (
                  <Button
                    type="button"
                    size="sm"
                    variant={state.exportFormat() === format ? "filled" : "outline"}
                    onClick={() => state.setExportFormat(format)}
                    aria-pressed={state.exportFormat() === format}
                  >
                    {exportFormatLabels[format]}
                  </Button>
                )}
              </For>
            </div>
            <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {state.exportScope() === "organization"
                ? exportFormatOrganizationDescriptions[state.exportFormat()]
                : exportFormatPersonalDescriptions[state.exportFormat()]}
            </p>
          </div>

          <Show when={state.exportFormat() === "json-encrypted"}>
            <div>
              <Label for="export-file-password" class="block text-sm font-medium text-slate-700 dark:text-slate-300">
                File Password
              </Label>
              <Input
                id="export-file-password"
                type="password"
                autocomplete="new-password"
                disabled={state.isExporting()}
                value={state.exportFilePassword()}
                onInput={(event) => state.setExportFilePassword(event.currentTarget.value)}
                class="mt-1 w-full"
              />
              <p class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Choose a password used only to protect this file. It is not your account master password and cannot be
                recovered if lost.
              </p>
            </div>

            <div>
              <Label
                for="export-file-password-confirm"
                class="block text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Confirm File Password
              </Label>
              <Input
                id="export-file-password-confirm"
                type="password"
                autocomplete="new-password"
                disabled={state.isExporting()}
                value={state.exportFilePasswordConfirm()}
                onInput={(event) => state.setExportFilePasswordConfirm(event.currentTarget.value)}
                class="mt-1 w-full"
              />
              <Show when={state.exportPasswordMismatch()}>
                <p class="mt-1 text-xs text-red-600 dark:text-red-400">
                  The file password and its confirmation do not match.
                </p>
              </Show>
            </div>
          </Show>

          <Show when={state.exportFormat() !== "json-encrypted"}>
            <Show when={state.exportScope() === "personal"}>
              <div>
                <Label
                  for="export-master-password"
                  class="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Master Password (only needed while the vault is locked)
                </Label>
                <Input
                  id="export-master-password"
                  type="password"
                  autocomplete="current-password"
                  disabled={state.isExporting()}
                  value={state.exportMasterPassword()}
                  onInput={(event) => state.setExportMasterPassword(event.currentTarget.value)}
                  class="mt-1 w-full"
                />
              </div>
            </Show>

            <Show when={state.exportFormat() !== "json-account-encrypted"}>
              <div class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
                Warning: this export is not encrypted and contains your passwords and secrets in plain text. Store it in
                a secure location and delete it when no longer needed.
                <Show when={state.exportFormat() === "csv-decrypted"}>
                  <span>
                    {" "}
                    CSV is also lossy: cards, identities, additional URIs, attachments, and password history are not
                    included, and custom fields are flattened.
                  </span>
                </Show>
                <Show when={state.exportFormat() === "zip"}>
                  <span>
                    {" "}
                    The ZIP also contains every attachment as a decrypted file next to the JSON export. Attachments that
                    cannot be downloaded or decrypted are skipped and reported after the export.
                  </span>
                </Show>
              </div>
            </Show>
          </Show>

          <Show when={state.exportFormat() === "json-account-encrypted"}>
            <div class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
              Warning: this export can only be decrypted by this account with its current encryption key. It is not
              portable and becomes unreadable after rotating your encryption keys.
            </div>
          </Show>

          <Show when={state.exportValidationMessage()}>
            {(message) => (
              <div
                role="alert"
                class="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
              >
                {message()}
              </div>
            )}
          </Show>

          <Show when={state.exportSummary()}>
            {(summary) => (
              <div
                role="status"
                class="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
              >
                <p class="font-medium">Export complete</p>
                <ul class="mt-1 list-disc pl-5">
                  <li>File: {summary().filename}</li>
                  <Show when={summary().cipherCount !== null}>
                    <li>{summary().cipherCount} items exported</li>
                  </Show>
                  <Show when={summary().collectionCount !== null}>
                    <li>{summary().collectionCount} collections exported</li>
                  </Show>
                  <Show when={summary().skippedCount > 0}>
                    <li>{summary().skippedCount} entries skipped</li>
                  </Show>
                </ul>
                <Show when={summary().warnings.length > 0}>
                  <p class="mt-2 font-medium">Warnings</p>
                  <ul class="mt-1 list-disc pl-5">
                    <For each={summary().warnings}>{(warning) => <li>{warning}</li>}</For>
                  </ul>
                </Show>
              </div>
            )}
          </Show>

          <div class="pt-2 flex items-center gap-3">
            <Button
              type="submit"
              variant="filled"
              size="sm"
              class="h-9 text-sm"
              disabled={!state.canSubmitExport()}
              aria-busy={state.isExporting()}
            >
              <Icon path={vaultSvgIcons.download} class="mr-1.5 size-3.5" />
              {state.isExporting() ? "Exporting..." : "Export Vault"}
            </Button>
            <Show when={state.canCopyExport()}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                class="h-9 text-sm"
                disabled={state.isExporting()}
                onClick={state.handleCopyExport}
              >
                <Icon path={vaultSvgIcons.copy} class="mr-1.5 size-3.5" />
                Copy to Clipboard
              </Button>
            </Show>
            <Show when={state.exportFormat() === "zip"}>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                The ZIP archive is binary and can only be downloaded, not copied.
              </p>
            </Show>
          </div>
        </form>
      </Show>
    </CardWrapper>
  )
}
