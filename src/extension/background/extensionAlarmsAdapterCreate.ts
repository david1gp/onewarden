import type { ExtensionAlarmsAdapter } from "./extensionAlarmsAdapter.js"

type ChromeAlarms = {
  create: (name: string, alarmInfo: { delayInMinutes: number }) => void | Promise<void>
  clear: (name: string) => boolean | Promise<boolean>
  onAlarm: { addListener: (listener: (alarm: { name: string }) => void) => void }
}

export function extensionAlarmsAdapterCreate(alarms: ChromeAlarms): ExtensionAlarmsAdapter {
  return {
    create: async (name, alarmInfo) => {
      await alarms.create(name, alarmInfo)
    },
    clear: async (name) => alarms.clear(name),
    onAlarm: (listener) => alarms.onAlarm.addListener(listener),
  }
}
