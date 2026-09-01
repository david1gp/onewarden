import { index, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { ciphers } from "./ciphers.js"
import { collections } from "./collections.js"

export const ciphersCollections = sqliteTable(
  "ciphers_collections",
  {
    cipherUuid: text("cipher_uuid")
      .notNull()
      .references(() => ciphers.uuid),
    collectionUuid: text("collection_uuid")
      .notNull()
      .references(() => collections.uuid),
  },
  (table) => [
    primaryKey({ columns: [table.cipherUuid, table.collectionUuid] }),
    index("ciphers_collections_cipher_uuid_index").on(table.cipherUuid),
    index("ciphers_collections_collection_uuid_index").on(table.collectionUuid),
  ],
)

export type CipherCollectionRow = typeof ciphersCollections.$inferSelect
export type CipherCollectionInsert = typeof ciphersCollections.$inferInsert
