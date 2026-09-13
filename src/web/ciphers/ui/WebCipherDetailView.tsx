import type { JSX } from "solid-js"
import { CipherDetailView } from "./CipherDetailView.jsx"
import { type CipherDetailViewStateProps, cipherDetailViewStateCreate } from "./cipherDetailViewStateCreate.js"

export function WebCipherDetailView(props: CipherDetailViewStateProps): JSX.Element {
  const state = cipherDetailViewStateCreate(props)

  return <CipherDetailView state={state} />
}
