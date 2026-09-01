import { expect, test } from "bun:test"
import { getTableConfig, type SQLiteTable } from "drizzle-orm/sqlite-core"
import { databaseClose } from "../../../src/server/database/databaseClose.js"
import { databaseSchemaTablesValidate } from "../../../src/server/database/databaseSchemaTablesValidate.js"
import { databaseTestCreate } from "../../../src/server/database/databaseTestCreate.js"
import { databaseSchema } from "../../../src/server/database/schema/databaseSchema.js"
import { users, type UserRow } from "../../../src/server/database/schema/users.js"

type TableInfoRow = {
  name: string
  type: string
  notnull: number
  dflt_value: string | null
  pk: number
}

type IndexListRow = {
  name: string
  unique: number
  origin: string
}

type IndexInfoRow = {
  seq: number
  name: string
}

type ForeignKeyRow = {
  id: number
  seq: number
  table: string
  from: string
  to: string
  on_delete: string
}

type SchemaColumn = {
  name: string
  getSQLType: () => string
  notNull: boolean
  default: unknown
  primary: boolean
  isUnique: boolean
  dataType: string
  mode?: string
}

function schemaColumnsRead(table: SQLiteTable): SchemaColumn[] {
  return getTableConfig(table).columns as SchemaColumn[]
}

function sqliteTypeNormalize(type: string): string {
  return type.toUpperCase() === "BOOLEAN" ? "INTEGER" : type.toUpperCase()
}

function sqliteDefaultRead(value: unknown): string | null {
  if (value === undefined) return null
  if (typeof value === "boolean") return value ? "1" : "0"
  if (typeof value === "number") return String(value)
  if (typeof value === "string") return `'${value.replaceAll("'", "''")}'`
  return "CURRENT_TIMESTAMP"
}

function schemaPrimaryColumnsRead(table: SQLiteTable, columns: SchemaColumn[]): string[] {
  const config = getTableConfig(table)
  if (config.primaryKeys.length > 0) return config.primaryKeys[0]?.columns.map((column) => column.name) ?? []
  return columns.filter((column) => column.primary).map((column) => column.name)
}

function schemaUniqueKeysRead(table: SQLiteTable, primaryColumns: string[][]): string[][] {
  const config = getTableConfig(table)
  const columns = schemaColumnsRead(table)
  const primaryKeyIsRowId =
    primaryColumns.length === 1 &&
    primaryColumns[0]?.length === 1 &&
    columns
      .find((column) => column.name === primaryColumns[0]?.[0])
      ?.getSQLType()
      .toUpperCase() === "INTEGER"
  const keys = [
    ...(primaryKeyIsRowId ? [] : primaryColumns),
    ...config.uniqueConstraints.map((constraint) => constraint.columns.map((column) => column.name)),
    ...schemaColumnsRead(table)
      .filter((column) => column.isUnique)
      .map((column) => [column.name]),
  ]
  const uniqueKeys = new Map(keys.map((columns) => [columns.join("\u0000"), columns]))
  return [...uniqueKeys.values()].sort((left, right) => left.join("\u0000").localeCompare(right.join("\u0000")))
}

function databaseUniqueKeysRead(database: Parameters<typeof databaseClose>[0], tableName: string): string[][] {
  const indexRows = database.query<IndexListRow, []>(`PRAGMA index_list("${tableName}")`).all()
  const keys = indexRows
    .filter((row) => row.unique === 1)
    .map((row) =>
      database
        .query<IndexInfoRow, []>(`PRAGMA index_info("${row.name}")`)
        .all()
        .sort((left, right) => left.seq - right.seq)
        .map((column) => column.name),
    )
  return keys.sort((left, right) => left.join("\u0000").localeCompare(right.join("\u0000")))
}

function databaseForeignKeysRead(database: Parameters<typeof databaseClose>[0], tableName: string) {
  const rows = database.query<ForeignKeyRow, []>(`PRAGMA foreign_key_list("${tableName}")`).all()
  const grouped = new Map<number, ForeignKeyRow[]>()
  for (const row of rows) grouped.set(row.id, [...(grouped.get(row.id) ?? []), row])
  return [...grouped.values()]
    .map((foreignKeyRows) => {
      const firstRow = foreignKeyRows[0]
      if (firstRow === undefined) return undefined
      const orderedRows = foreignKeyRows.toSorted((left, right) => left.seq - right.seq)
      return {
        from: orderedRows.map((row) => row.from),
        to: orderedRows.map((row) => row.to),
        table: firstRow.table,
        onDelete: firstRow.on_delete,
      }
    })
    .filter((foreignKey): foreignKey is NonNullable<typeof foreignKey> => foreignKey !== undefined)
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)))
}

test("database schema metadata matches the fully migrated SQLite schema", () => {
  const databaseResult = databaseTestCreate()
  expect(databaseResult.success).toBe(true)
  if (!databaseResult.success) return
  const database = databaseResult.data

  try {
    expect(databaseSchemaTablesValidate(database).success).toBe(true)

    const schemaTables = Object.values(databaseSchema) as SQLiteTable[]
    const schemaTableNames = schemaTables.map((table) => getTableConfig(table).name).sort()
    const databaseTableNames = database
      .query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row) => row.name)
      .sort()
    expect(databaseTableNames).toEqual(schemaTableNames)

    for (const table of schemaTables) {
      const config = getTableConfig(table)
      const columns = schemaColumnsRead(table)
      const primaryColumns = schemaPrimaryColumnsRead(table, columns)
      const actualColumns = database.query<TableInfoRow, []>(`PRAGMA table_info("${config.name}")`).all()
      expect(
        actualColumns.map((column) => ({
          name: column.name,
          type: sqliteTypeNormalize(column.type),
          notnull: column.notnull,
          dflt_value: column.dflt_value,
          pk: column.pk,
        })),
      ).toEqual(
        columns.map((column) => ({
          name: column.name,
          type: sqliteTypeNormalize(column.getSQLType()),
          notnull: column.notNull ? 1 : 0,
          dflt_value: sqliteDefaultRead(column.default),
          pk: primaryColumns.indexOf(column.name) + 1,
        })),
      )

      const expectedIndexes = config.indexes
        .map((index) => ({
          name: index.config.name,
          unique: index.config.unique ? 1 : 0,
          columns: index.config.columns.map((column) => {
            if (!("name" in column)) throw new Error(`Unsupported SQL index expression on ${config.name}`)
            return column.name
          }),
        }))
        .sort((left, right) => left.name.localeCompare(right.name))
      const actualIndexes = database
        .query<IndexListRow, []>(`PRAGMA index_list("${config.name}")`)
        .all()
        .filter((index) => index.origin === "c")
        .map((index) => ({
          name: index.name,
          unique: index.unique,
          columns: database
            .query<IndexInfoRow, []>(`PRAGMA index_info("${index.name}")`)
            .all()
            .sort((left, right) => left.seq - right.seq)
            .map((column) => column.name),
        }))
        .sort((left, right) => left.name.localeCompare(right.name))
      expect(actualIndexes).toEqual(expectedIndexes)

      expect(databaseUniqueKeysRead(database, config.name)).toEqual(
        schemaUniqueKeysRead(table, primaryColumns.length > 0 ? [primaryColumns] : []),
      )

      const expectedForeignKeys = config.foreignKeys
        .map((foreignKey) => {
          const reference = foreignKey.reference()
          return {
            from: reference.columns.map((column) => column.name),
            to: reference.foreignColumns.map((column) => column.name),
            table: getTableConfig(reference.foreignTable).name,
            onDelete: (foreignKey.onDelete ?? "NO ACTION").toUpperCase(),
          }
        })
        .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)))
      expect(databaseForeignKeysRead(database, config.name)).toEqual(expectedForeignKeys)
    }

    const typedRows: UserRow[] = database.drizzle.select().from(users).all()
    expect(typedRows).toEqual([])
  } finally {
    databaseClose(database)
  }
})

test("database schema metadata keeps SQLite modes and check constraints explicit", () => {
  const booleanModeColumns = [
    "users.enabled",
    "users_organizations.access_all",
    "users_collections.read_only",
    "users_collections.hide_passwords",
    "users_collections.manage",
    "groups.access_all",
    "collections_groups.read_only",
    "collections_groups.hide_passwords",
    "collections_groups.manage",
    "sends.disabled",
    "sends.hide_email",
    "org_policies.enabled",
    "organization_sso_configs.enabled",
    "twofactor.enabled",
    "auth_requests.approved",
  ].sort()
  const actualBooleanModeColumns = (Object.values(databaseSchema) as SQLiteTable[])
    .flatMap((table) => {
      const config = getTableConfig(table)
      return schemaColumnsRead(table)
        .filter((column) => column.mode === "boolean")
        .map((column) => `${config.name}.${column.name}`)
    })
    .sort()
  expect(actualBooleanModeColumns).toEqual(booleanModeColumns)

  const bufferModeColumns = (Object.values(databaseSchema) as SQLiteTable[])
    .flatMap((table) => {
      const config = getTableConfig(table)
      return schemaColumnsRead(table)
        .filter((column) => column.dataType === "buffer")
        .map((column) => `${config.name}.${column.name}`)
    })
    .sort()
  expect(bufferModeColumns).toEqual(["sends.password_hash", "sends.password_salt", "users.password_hash", "users.salt"])

  const databaseResult = databaseTestCreate()
  expect(databaseResult.success).toBe(true)
  if (!databaseResult.success) return
  const database = databaseResult.data
  try {
    const expectedChecks = new Map([
      ["identity_signing_keys", ["CHECK (id = 1)"]],
      [
        "extension_session_handoffs",
        [
          "CHECK (operation IN ('create', 'edit'))",
          "CHECK ( (operation = 'create' AND cipher_uuid IS NULL) OR (operation = 'edit' AND cipher_uuid IS NOT NULL) )",
        ],
      ],
    ])
    for (const [tableName, expectedCheckFragments] of expectedChecks) {
      const table = (Object.values(databaseSchema) as SQLiteTable[]).find(
        (candidate) => getTableConfig(candidate).name === tableName,
      )
      if (table === undefined) throw new Error(`Missing schema table ${tableName}`)
      expect(getTableConfig(table).checks).toHaveLength(expectedCheckFragments.length)
      const tableSql = database
        .query<{ sql: string }, [string]>("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?")
        .get(tableName)?.sql
      expect(tableSql).toBeDefined()
      const normalizedTableSql = tableSql?.replaceAll(/\s+/g, " ")
      expect(normalizedTableSql?.match(/\bCHECK\s*\(/gi)).toHaveLength(expectedCheckFragments.length)
      for (const checkFragment of expectedCheckFragments) expect(normalizedTableSql).toContain(checkFragment)
    }
  } finally {
    databaseClose(database)
  }
})
