import * as v from "valibot"
import { extensionAttachmentDeleteRequestSchema } from "../background/extensionAttachmentDeleteRequestSchema.js"
import { extensionAttachmentDownloadRequestSchema } from "../background/extensionAttachmentDownloadRequestSchema.js"
import { extensionAttachmentUploadRequestSchema } from "../background/extensionAttachmentUploadRequestSchema.js"
import { extensionCipherArchiveRequestSchema } from "../background/extensionCipherArchiveRequestSchema.js"
import { extensionCipherCollectionsUpdateRequestSchema } from "../background/extensionCipherCollectionsUpdateRequestSchema.js"
import { extensionCipherCreateRequestSchema } from "../background/extensionCipherCreateRequestSchema.js"
import { extensionCipherDeleteRequestSchema } from "../background/extensionCipherDeleteRequestSchema.js"
import { extensionCipherDetailReadRequestSchema } from "../background/extensionCipherDetailReadRequestSchema.js"
import { extensionCipherMoveRequestSchema } from "../background/extensionCipherMoveRequestSchema.js"
import { extensionCipherPartialRequestSchema } from "../background/extensionCipherPartialRequestSchema.js"
import { extensionCipherRestoreRequestSchema } from "../background/extensionCipherRestoreRequestSchema.js"
import { extensionCipherUpdateRequestSchema } from "../background/extensionCipherUpdateRequestSchema.js"
import { extensionCollectionCreateRequestSchema } from "../background/extensionCollectionCreateRequestSchema.js"
import { extensionCollectionDeleteRequestSchema } from "../background/extensionCollectionDeleteRequestSchema.js"
import { extensionCollectionListRequestSchema } from "../background/extensionCollectionListRequestSchema.js"
import { extensionCollectionReadRequestSchema } from "../background/extensionCollectionReadRequestSchema.js"
import { extensionCollectionUpdateRequestSchema } from "../background/extensionCollectionUpdateRequestSchema.js"
import { extensionFolderCreateRequestSchema } from "../background/extensionFolderCreateRequestSchema.js"
import { extensionFolderDeleteRequestSchema } from "../background/extensionFolderDeleteRequestSchema.js"
import { extensionFolderListRequestSchema } from "../background/extensionFolderListRequestSchema.js"
import { extensionFolderReadRequestSchema } from "../background/extensionFolderReadRequestSchema.js"
import { extensionFolderUpdateRequestSchema } from "../background/extensionFolderUpdateRequestSchema.js"
import { extensionVaultSearchRequestSchema } from "../background/extensionVaultSearchRequestSchema.js"
import { extensionLoginFillRequestSchema } from "../fill/extensionLoginFillRequestSchema.js"
import { extensionFullWindowPane } from "../fullwindow/ExtensionFullWindowPane.js"
import { extensionPasskeyAssertionRequestSchema } from "../passkey/extensionPasskeyAssertionRequestSchema.js"
import { extensionPasskeyCredentialCreateRequestSchema } from "../passkey/extensionPasskeyCredentialCreateRequestSchema.js"
import { extensionLockPolicyRequestSchema } from "../storage/extensionLockPolicyRequestSchema.js"

const extensionRuntimeSurfaceSchema = v.picklist(["popup", "fullwindow"])

const extensionRuntimeMessageSchemaData = v.variant("type", [
  v.strictObject({ type: v.literal("initialize") }),
  v.strictObject({ type: v.literal("login"), request: v.unknown() }),
  v.strictObject({ type: v.literal("unlock"), request: v.unknown() }),
  v.strictObject({
    type: v.literal("viewModelLoad"),
    surface: v.optional(extensionRuntimeSurfaceSchema, "popup"),
  }),
  v.strictObject({ type: v.literal("conditionalSync") }),
  v.strictObject({ type: v.literal("manualSync") }),
  v.strictObject({ type: v.literal("vaultSearch"), request: extensionVaultSearchRequestSchema }),
  v.strictObject({ type: v.literal("cipherDetailRead"), request: extensionCipherDetailReadRequestSchema }),
  v.strictObject({ type: v.literal("cipherCreate"), request: extensionCipherCreateRequestSchema }),
  v.strictObject({ type: v.literal("cipherUpdate"), request: extensionCipherUpdateRequestSchema }),
  v.strictObject({ type: v.literal("cipherPartial"), request: extensionCipherPartialRequestSchema }),
  v.strictObject({ type: v.literal("cipherDelete"), request: extensionCipherDeleteRequestSchema }),
  v.strictObject({ type: v.literal("cipherRestore"), request: extensionCipherRestoreRequestSchema }),
  v.strictObject({ type: v.literal("cipherArchive"), request: extensionCipherArchiveRequestSchema }),
  v.strictObject({ type: v.literal("cipherMove"), request: extensionCipherMoveRequestSchema }),
  v.strictObject({
    type: v.literal("cipherCollectionsUpdate"),
    request: extensionCipherCollectionsUpdateRequestSchema,
  }),
  v.strictObject({ type: v.literal("attachmentUpload"), request: extensionAttachmentUploadRequestSchema }),
  v.strictObject({ type: v.literal("attachmentDownload"), request: extensionAttachmentDownloadRequestSchema }),
  v.strictObject({ type: v.literal("attachmentDelete"), request: extensionAttachmentDeleteRequestSchema }),
  v.strictObject({ type: v.literal("folderList"), request: extensionFolderListRequestSchema }),
  v.strictObject({ type: v.literal("folderRead"), request: extensionFolderReadRequestSchema }),
  v.strictObject({ type: v.literal("folderCreate"), request: extensionFolderCreateRequestSchema }),
  v.strictObject({ type: v.literal("folderUpdate"), request: extensionFolderUpdateRequestSchema }),
  v.strictObject({ type: v.literal("folderDelete"), request: extensionFolderDeleteRequestSchema }),
  v.strictObject({ type: v.literal("collectionList"), request: extensionCollectionListRequestSchema }),
  v.strictObject({ type: v.literal("collectionRead"), request: extensionCollectionReadRequestSchema }),
  v.strictObject({ type: v.literal("collectionCreate"), request: extensionCollectionCreateRequestSchema }),
  v.strictObject({ type: v.literal("collectionUpdate"), request: extensionCollectionUpdateRequestSchema }),
  v.strictObject({ type: v.literal("collectionDelete"), request: extensionCollectionDeleteRequestSchema }),
  v.strictObject({
    type: v.literal("sessionHandoffOpen"),
    request: v.variant("operation", [
      v.strictObject({ operation: v.literal("create"), cipherId: v.null() }),
      v.strictObject({
        operation: v.literal("edit"),
        cipherId: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
      }),
    ]),
  }),
  v.strictObject({ type: v.literal("environmentSave"), request: v.unknown() }),
  v.strictObject({ type: v.literal("lockPolicyLoad") }),
  v.strictObject({ type: v.literal("lockPolicySave"), request: extensionLockPolicyRequestSchema }),
  v.strictObject({ type: v.literal("lock") }),
  v.strictObject({ type: v.literal("logout") }),
  v.strictObject({ type: v.literal("activeTabContextLookup") }),
  v.strictObject({ type: v.literal("loginFill"), request: extensionLoginFillRequestSchema }),
  v.strictObject({
    type: v.literal("totpCopy"),
    request: v.strictObject({ loginId: v.pipe(v.string(), v.minLength(1)) }),
  }),
  v.strictObject({
    type: v.literal("fullWindowOpen"),
    pane: v.optional(v.picklist(Object.values(extensionFullWindowPane))),
  }),
  v.strictObject({ type: v.literal("passkeyConsentContext"), request: v.unknown() }),
  v.strictObject({
    type: v.literal("passkeyCredentialCreate"),
    request: extensionPasskeyCredentialCreateRequestSchema,
  }),
  v.strictObject({ type: v.literal("passkeyAssertion"), request: extensionPasskeyAssertionRequestSchema }),
  v.strictObject({
    type: v.literal("passkeyConsentUiLoad"),
    request: v.strictObject({ requestId: v.pipe(v.string(), v.minLength(1), v.maxLength(128)) }),
  }),
  v.strictObject({
    type: v.literal("passkeyConsentUiVerify"),
    request: v.strictObject({
      requestId: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
      password: v.pipe(v.string(), v.minLength(1), v.maxLength(1_000)),
    }),
  }),
  v.strictObject({
    type: v.literal("passkeyConsentUiApprove"),
    request: v.strictObject({
      requestId: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
      cipherId: v.pipe(v.string(), v.minLength(1), v.maxLength(128)),
      credentialId: v.nullable(v.pipe(v.string(), v.minLength(1), v.maxLength(256))),
      revisionDate: v.string(),
    }),
  }),
  v.strictObject({
    type: v.literal("passkeyConsentUiCancel"),
    request: v.strictObject({ requestId: v.pipe(v.string(), v.minLength(1), v.maxLength(128)) }),
  }),
])

export const extensionRuntimeMessageSchema = extensionRuntimeMessageSchemaData

export type ExtensionRuntimeMessage = v.InferOutput<typeof extensionRuntimeMessageSchema>
