import { onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { webAuthSessionCreate } from "../../auth/model/webAuthSessionCreate.js"
import type { AccountDevice } from "../model/accountDeviceSchema.js"
import { webSettingsApiClientCreate } from "../model/webSettingsApiClientCreate.js"

export interface AccountDevicesCardProps {
  session: ReturnType<typeof webAuthSessionCreate>
  apiClient?: ReturnType<typeof webSettingsApiClientCreate>
  onNotifySuccess?: (message: string) => void
  onNotifyError?: (message: string) => void
}

export function accountDevicesCardStateCreate(props: AccountDevicesCardProps) {
  const apiClient = props.apiClient ?? webSettingsApiClientCreate()

  const devices = createSignalObject<AccountDevice[]>([])
  const isLoading = createSignalObject(false)

  // Deauthorize all dialog state
  const isDeauthorizeDialogOpen = createSignalObject(false)
  const masterPasswordInput = createSignalObject("")
  const isDeauthorizing = createSignalObject(false)

  const loadDevices = async () => {
    const sessionData = props.session.session()
    if (sessionData === null) return
    isLoading.set(true)
    const result = await apiClient.devicesGet(sessionData.accessToken)
    isLoading.set(false)

    if (result.success) {
      devices.set(result.data.data)
    } else {
      props.onNotifyError?.(result.errorMessage)
    }
  }

  onMount(() => {
    loadDevices()
  })

  const openDeauthorizeDialog = () => {
    masterPasswordInput.set("")
    isDeauthorizeDialogOpen.set(true)
  }

  const closeDeauthorizeDialog = () => {
    isDeauthorizeDialogOpen.set(false)
    masterPasswordInput.set("")
  }

  const handleDeauthorizeAll = async () => {
    const sessionData = props.session.session()
    if (sessionData === null) return
    if (masterPasswordInput.get().length === 0) {
      props.onNotifyError?.("Master password is required.")
      return
    }

    isDeauthorizing.set(true)
    const hashResult = await props.session.masterPasswordHashDeriveForSession(masterPasswordInput.get())
    if (!hashResult.success) {
      isDeauthorizing.set(false)
      props.onNotifyError?.(hashResult.errorMessage)
      return
    }

    const result = await apiClient.securityStampRotate(sessionData.accessToken, hashResult.data)
    isDeauthorizing.set(false)

    if (result.success) {
      closeDeauthorizeDialog()
      props.onNotifySuccess?.("All sessions deauthorized successfully.")
      loadDevices()
    } else {
      props.onNotifyError?.(result.errorMessage)
    }
  }

  const deviceTypeLabel = (type: number): string => {
    switch (type) {
      case 0:
        return "Android"
      case 1:
        return "iOS"
      case 2:
        return "Chrome Extension"
      case 3:
        return "Firefox Extension"
      case 4:
        return "Opera Extension"
      case 5:
        return "Edge Extension"
      case 6:
        return "Windows Desktop"
      case 7:
        return "macOS Desktop"
      case 8:
        return "Linux Desktop"
      case 9:
        return "Safari Extension"
      case 10:
        return "Vivaldi Extension"
      case 11:
        return "Brave Extension"
      case 14:
        return "Web Vault"
      default:
        return "Client Device"
    }
  }

  return {
    devices: devices.get,
    isLoading: isLoading.get,
    loadDevices,
    deviceTypeLabel,
    isDeauthorizeDialogOpen: isDeauthorizeDialogOpen.get,
    openDeauthorizeDialog,
    closeDeauthorizeDialog,
    masterPasswordInput: masterPasswordInput.get,
    setMasterPasswordInput: masterPasswordInput.set,
    isDeauthorizing: isDeauthorizing.get,
    handleDeauthorizeAll,
  }
}
