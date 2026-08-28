export const notificationUpdateType = {
  authRequest: 15,
  authRequestResponse: 16,
  logOut: 11,
  none: 100,
  syncCipherCreate: 1,
  syncCipherUpdate: 0,
  syncCiphers: 4,
  syncFolderCreate: 7,
  syncFolderDelete: 3,
  syncFolderUpdate: 8,
  syncLoginDelete: 2,
  syncOrgKeys: 6,
  syncSendCreate: 12,
  syncSendDelete: 14,
  syncSendUpdate: 13,
  syncSettings: 10,
  syncVault: 5,
} as const

export type NotificationUpdateType = (typeof notificationUpdateType)[keyof typeof notificationUpdateType]
