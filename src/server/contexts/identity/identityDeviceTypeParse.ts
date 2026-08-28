export function identityDeviceTypeParse(value: string | undefined): number {
  if (value === undefined || !/^[+-]?\d+$/.test(value)) return 14
  const type = Number(value)
  if (!Number.isSafeInteger(type) || type < -2_147_483_648 || type > 2_147_483_647) return 14
  return type
}
