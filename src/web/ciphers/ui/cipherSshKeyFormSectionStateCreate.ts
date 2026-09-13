import type { SignalObject } from "#ui/utils/createSignalObject.js"

export interface CipherSshKeyFormSectionStateProps {
  privateKeySignal: SignalObject<string>
  publicKeySignal: SignalObject<string>
  fingerprintSignal: SignalObject<string>
}

export function cipherSshKeyFormSectionStateCreate(props: CipherSshKeyFormSectionStateProps) {
  return {
    privateKeySignal: props.privateKeySignal,
    publicKeySignal: props.publicKeySignal,
    fingerprintSignal: props.fingerprintSignal,
  }
}
