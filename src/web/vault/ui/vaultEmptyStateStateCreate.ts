export interface VaultEmptyStateProps {
  title?: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export function vaultEmptyStateStateCreate(props: VaultEmptyStateProps = {}) {
  const title = () => props.title ?? "Your vault is empty"
  const description = () =>
    props.description ?? "Items you create or import will appear here securely encrypted with your vault key."
  const actionLabel = () => props.actionLabel

  const handleAction = () => {
    if (props.onAction) {
      props.onAction()
    }
  }

  return {
    title,
    description,
    actionLabel,
    handleAction,
  }
}
