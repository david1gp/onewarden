import { customType } from "drizzle-orm/sqlite-core"

export const sqliteDateTime = customType<{ data: string; driverData: string }>({
  dataType: () => "DATETIME",
})
