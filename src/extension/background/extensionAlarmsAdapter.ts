export type ExtensionAlarmsAdapter = {
  create: (name: string, alarmInfo: { delayInMinutes: number }) => Promise<void>
  clear: (name: string) => Promise<boolean>
  onAlarm: (listener: (alarm: { name: string }) => void) => void
}
