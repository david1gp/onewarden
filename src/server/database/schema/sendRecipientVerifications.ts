import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { sends } from "./sends.js"

export const sendRecipientVerifications = sqliteTable(
  "send_recipient_verifications",
  {
    sendUuid: text("send_uuid")
      .notNull()
      .references(() => sends.uuid, { onDelete: "cascade" }),
    email: text("email").notNull(),
    otpHash: text("otp_hash").notNull(),
    otpSalt: text("otp_salt").notNull(),
    otpExpiresAt: text("otp_expires_at").notNull(),
    attempts: integer("attempts").notNull().default(0),
    lastSentAt: text("last_sent_at").notNull(),
    resendCount: integer("resend_count").notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.sendUuid, table.email] }),
    index("send_recipient_verifications_email_index").on(table.email),
    index("send_recipient_verifications_expiry_index").on(table.otpExpiresAt),
  ],
)

export type SendRecipientVerificationRow = typeof sendRecipientVerifications.$inferSelect
export type SendRecipientVerificationInsert = typeof sendRecipientVerifications.$inferInsert
