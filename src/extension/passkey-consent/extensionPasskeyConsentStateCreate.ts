import { onMount } from "solid-js"
import * as v from "valibot"
import type { Result } from "#result"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { ExtensionRuntimeMessage } from "../messaging/extensionRuntimeMessageSchema.js"
import { extensionRuntimeMessageSend } from "../messaging/extensionRuntimeMessageSend.js"
import { extensionPasskeyConsentSchema } from "../passkey/extensionPasskeyConsentSchema.js"
import type { ExtensionPasskeyConsentUiModel } from "../passkey/extensionPasskeyConsentUiModelSchema.js"

type Candidate = ExtensionPasskeyConsentUiModel["candidates"][number]

/** Creates local state and commands for the extension-owned passkey confirmation view. */
export function extensionPasskeyConsentStateCreate(
  options: {
    requestId?: string
    messageSend?: <T = unknown>(message: ExtensionRuntimeMessage) => Promise<Result<T>>
    close?: () => void
  } = {},
) {
  const requestParam = new URLSearchParams(globalThis.location?.search ?? "").get("request")
  const requestResult = v.safeParse(extensionPasskeyConsentSchema.entries.requestId, requestParam)
  const requestId = options.requestId ?? (requestResult.success ? requestResult.output : "")
  const sender = options.messageSend ?? extensionRuntimeMessageSend
  const close = options.close ?? (() => globalThis.close())
  const modelSignal = createSignalObject<ExtensionPasskeyConsentUiModel | null>(null)
  const passwordSignal = createSignalObject("")
  const selectedKeySignal = createSignalObject("")
  const busySignal = createSignalObject(false)
  const errorSignal = createSignalObject<string | null>(null)

  const modelAccept = (model: ExtensionPasskeyConsentUiModel) => {
    modelSignal.set(model)
    const selected = candidateSelectedRead(model.candidates, selectedKeySignal.get())
    if (selected === null || selected.readOnly) {
      selectedKeySignal.set(candidateKeyCreate(model.candidates.find((candidate) => !candidate.readOnly) ?? null))
    }
  }

  const load = async (): Promise<void> => {
    busySignal.set(true)
    errorSignal.set(null)
    const result = await sender<ExtensionPasskeyConsentUiModel>({
      type: "passkeyConsentUiLoad",
      request: { requestId },
    })
    busySignal.set(false)
    if (!result.success) {
      errorSignal.set(result.errorMessage)
      return
    }
    modelAccept(result.data)
  }

  const verify = async (): Promise<void> => {
    busySignal.set(true)
    errorSignal.set(null)
    const result = await sender<ExtensionPasskeyConsentUiModel>({
      type: "passkeyConsentUiVerify",
      request: { requestId, password: passwordSignal.get() },
    })
    passwordSignal.set("")
    busySignal.set(false)
    if (!result.success) {
      errorSignal.set(result.errorMessage)
      return
    }
    modelAccept(result.data)
  }

  const approve = async (): Promise<void> => {
    const model = modelSignal.get()
    const selected = model === null ? null : candidateSelectedRead(model.candidates, selectedKeySignal.get())
    if (selected === null || selected.readOnly) {
      errorSignal.set("Choose an editable login or credential.")
      return
    }
    busySignal.set(true)
    errorSignal.set(null)
    const result = await sender({
      type: "passkeyConsentUiApprove",
      request: {
        requestId,
        cipherId: selected.cipherId,
        credentialId: selected.credentialId,
        revisionDate: selected.revisionDate,
      },
    })
    busySignal.set(false)
    if (!result.success) {
      errorSignal.set(result.errorMessage)
      if (result.statusCode === 409) await load()
      return
    }
    close()
  }

  const cancel = async (): Promise<void> => {
    busySignal.set(true)
    await sender({ type: "passkeyConsentUiCancel", request: { requestId } })
    close()
  }

  onMount(() => void load())

  return {
    model: modelSignal.get,
    passwordSignal,
    selectedKeySignal,
    busy: busySignal.get,
    error: errorSignal.get,
    verify,
    approve,
    cancel,
    candidateKey: candidateKeyCreate,
  }
}

function candidateKeyCreate(candidate: Candidate | null): string {
  return candidate === null ? "" : `${candidate.cipherId}:${candidate.credentialId ?? "create"}`
}

function candidateSelectedRead(candidates: Candidate[], key: string): Candidate | null {
  return candidates.find((candidate) => candidateKeyCreate(candidate) === key) ?? null
}
