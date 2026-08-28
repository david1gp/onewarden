import { resultCreate } from "../../../shared/result/resultCreate.js"
import type { IdentityMailAdapter } from "./identityMailAdapter.js"

export function identityMailAdapterCreate(): IdentityMailAdapter {
  return {
    sendRegisterVerifyEmail: async () => resultCreate(undefined),
    sendWelcome: async () => resultCreate(undefined),
    sendWelcomeMustVerify: async () => resultCreate(undefined),
  }
}
