import { ciphers } from "../../database/schema/ciphers.js"

export const cipherProjection = {
  uuid: ciphers.uuid,
  createdAt: ciphers.createdAt,
  updatedAt: ciphers.updatedAt,
  userUuid: ciphers.userUuid,
  organizationUuid: ciphers.organizationUuid,
  key: ciphers.key,
  type: ciphers.atype,
  name: ciphers.name,
  notes: ciphers.notes,
  fields: ciphers.fields,
  data: ciphers.data,
  passwordHistory: ciphers.passwordHistory,
  deletedAt: ciphers.deletedAt,
  reprompt: ciphers.reprompt,
}
