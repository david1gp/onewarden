import { type JSX, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Textarea } from "#ui/input/textarea/Textarea.jsx"
import { vaultSvgIcons } from "../../demo/vaultSvgIcons.js"
import {
  type VaultImportExportCardProps,
  vaultImportExportCardStateCreate,
} from "./vaultImportExportCardStateCreate.js"

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
            <p class="text-xs text-slate-500 dark:text-slate-400">
              Backup, transfer, or restore your vault credentials
            </p>
          </div>
        </div>
        <div class="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs dark:bg-slate-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            class={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
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
            class={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
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
          <div>
            <Label class="block text-xs font-medium text-slate-700 dark:text-slate-300">File Format</Label>
            <div class="mt-1 flex gap-4">
              <Button
                type="button"
                size="sm"
                variant={state.importFormat() === "json" ? "filled" : "outline"}
                onClick={() => state.setImportFormat("json")}
                aria-pressed={state.importFormat() === "json"}
              >
                Bitwarden JSON
              </Button>
              <Button
                type="button"
                size="sm"
                variant={state.importFormat() === "csv" ? "filled" : "outline"}
                onClick={() => state.setImportFormat("csv")}
                aria-pressed={state.importFormat() === "csv"}
              >
                Bitwarden CSV
              </Button>
            </div>
          </div>

          <div>
            <Label for="import-file" class="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Select File to Import
            </Label>
            <div class="mt-1">
              <input
                id="import-file"
                type="file"
                accept=".json,.csv,application/json,text/csv"
                onChange={state.handleFileUpload}
                class="block w-full text-xs text-slate-500 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200 dark:file:bg-slate-800 dark:file:text-slate-300"
              />
            </div>
          </div>

          <div>
            <Label for="import-master-password" class="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Master Password (when vault is locked)
            </Label>
            <Input
              id="import-master-password"
              type="password"
              value={state.importPassword()}
              onInput={(event) => state.setImportPassword(event.currentTarget.value)}
              class="mt-1 w-full"
            />
          </div>

          <div>
            <Label for="import-paste" class="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Or Paste Vault Data
            </Label>
            <div class="mt-1">
              <Textarea
                id="import-paste"
                placeholder="Paste JSON or CSV content here..."
                rows={6}
                value={state.importContent()}
                onInput={(e) => state.setImportContent(e.currentTarget.value)}
                class="w-full font-mono text-xs"
              />
            </div>
          </div>

          <div class="pt-2">
            <Button type="submit" variant="filled" size="sm" class="h-9 text-xs" disabled={state.isImporting()}>
              {state.isImporting() ? "Importing Vault..." : "Import Vault"}
            </Button>
          </div>
        </form>
      </Show>

      <Show when={state.subTab() === "export"}>
        <form onSubmit={state.handleExport} class="mt-6 max-w-xl space-y-4">
          <div>
            <Label class="block text-xs font-medium text-slate-700 dark:text-slate-300">Export Format</Label>
            <div class="mt-1 flex flex-wrap gap-4">
              <Button
                type="button"
                size="sm"
                variant={state.exportFormat() === "json-decrypted" ? "filled" : "outline"}
                onClick={() => state.setExportFormat("json-decrypted")}
                aria-pressed={state.exportFormat() === "json-decrypted"}
              >
                Decrypted JSON (.json)
              </Button>
              <Button
                type="button"
                size="sm"
                variant={state.exportFormat() === "csv-decrypted" ? "filled" : "outline"}
                onClick={() => state.setExportFormat("csv-decrypted")}
                aria-pressed={state.exportFormat() === "csv-decrypted"}
              >
                Decrypted CSV (.csv)
              </Button>
              <Button
                type="button"
                size="sm"
                variant={state.exportFormat() === "json-encrypted" ? "filled" : "outline"}
                onClick={() => state.setExportFormat("json-encrypted")}
                aria-pressed={state.exportFormat() === "json-encrypted"}
              >
                Encrypted JSON (.json)
              </Button>
            </div>
          </div>

          <Show when={state.exportFormat() !== "json-encrypted"}>
            <div>
              <Label for="export-master-password" class="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Master Password (when vault is locked)
              </Label>
              <Input
                id="export-master-password"
                type="password"
                value={state.exportPassword()}
                onInput={(event) => state.setExportPassword(event.currentTarget.value)}
                class="mt-1 w-full"
              />
            </div>
          </Show>

          <Show when={state.exportFormat() !== "json-encrypted"}>
            <div class="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
              Warning: Decrypted exports contain your plaintext passwords and secrets. Store exported files in a secure
              location and delete them when no longer needed.
            </div>
          </Show>

          <div class="pt-2 flex items-center gap-3">
            <Button type="submit" variant="filled" size="sm" class="h-9 text-xs" disabled={state.isExporting()}>
              {state.isExporting() ? "Exporting..." : "Export Vault"}
            </Button>
            <Show when={state.lastExportData()}>
              <Button type="button" variant="outline" size="sm" class="h-9 text-xs" onClick={state.handleCopyExport}>
                Copy to Clipboard
              </Button>
            </Show>
          </div>
        </form>
      </Show>
    </CardWrapper>
  )
}
