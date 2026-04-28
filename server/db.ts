import { mkdirSync } from 'fs'
import { join } from 'path'
import { Database } from 'bun:sqlite'
import type { PocketItem } from '../src/types/pocket'

export type ItemStatus = PocketItem['status']
export type ValidationStatus = PocketItem['validation_status']

export type ImportItemInput = Omit<PocketItem, 'id'>

export interface CreateItemInput {
  title: string
  url: string
  tags?: string
  status?: ItemStatus
  archived_at?: number
  time_added?: number
}

export interface UpdateItemInput {
  title?: string
  tags?: string
  status?: ItemStatus
  validation_status?: ValidationStatus
  validation_checked_at?: number
}

export interface ImportSummary {
  insertedCount: number
  duplicateCount: number
}

const dataDirectory = join(process.cwd(), 'data')
mkdirSync(dataDirectory, { recursive: true })

const databasePath = join(dataDirectory, 'openshelf.db')
const db = new Database(databasePath, { create: true })

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    time_added INTEGER NOT NULL,
    tags TEXT DEFAULT '',
    status TEXT CHECK(status IN ('unread', 'archive')) DEFAULT 'unread',
    archived_at INTEGER,
    validation_status TEXT,
    validation_checked_at INTEGER
  );
`)

const baseSelect = `
  SELECT
    id,
    title,
    url,
    time_added,
    tags,
    status,
    archived_at,
    validation_status,
    validation_checked_at
  FROM items
`

function mapRow(row: Record<string, unknown> | null): PocketItem | null {
  if (!row) {
    return null
  }

  return {
    id: Number(row.id),
    title: String(row.title),
    url: String(row.url),
    time_added: Number(row.time_added),
    tags: String(row.tags ?? ''),
    status: row.status as ItemStatus,
    archived_at: row.archived_at == null ? undefined : Number(row.archived_at),
    validation_status: (row.validation_status ?? undefined) as ValidationStatus,
    validation_checked_at: row.validation_checked_at == null ? undefined : Number(row.validation_checked_at),
  }
}

export function getDatabasePath() {
  return databasePath
}

export function createDatabaseBackup(): Uint8Array {
  return db.serialize()
}

export function getAllItems(): PocketItem[] {
  const rows = db
    .query(`${baseSelect} ORDER BY time_added DESC, id DESC`)
    .all() as Record<string, unknown>[]

  return rows.map((row) => mapRow(row)).filter((item): item is PocketItem => item !== null)
}

export function getItemById(id: number): PocketItem | null {
  const row = db
    .query(`${baseSelect} WHERE id = ? LIMIT 1`)
    .get(id) as Record<string, unknown> | null

  return mapRow(row)
}

export function getItemByUrl(url: string): PocketItem | null {
  const row = db
    .query(`${baseSelect} WHERE url = ? LIMIT 1`)
    .get(url) as Record<string, unknown> | null

  return mapRow(row)
}

export function addItem(input: CreateItemInput): PocketItem {
  const archivedAt =
    input.archived_at ?? (input.status === 'archive' ? Math.floor(Date.now() / 1000) : null)
  const insertResult = db
    .query(`
      INSERT INTO items (title, url, time_added, tags, status, archived_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .run(
      input.title,
      input.url,
      input.time_added ?? Math.floor(Date.now() / 1000),
      input.tags ?? '',
      input.status ?? 'unread',
      archivedAt
    ) as { lastInsertRowid: number | bigint }

  const id = Number(insertResult.lastInsertRowid)
  const created = getItemById(id)

  if (!created) {
    throw new Error('Failed to load created item from database.')
  }

  return created
}

export function deleteItems(ids: number[]): number {
  if (ids.length === 0) {
    return 0
  }

  const placeholders = ids.map(() => '?').join(', ')
  const result = db
    .query(`DELETE FROM items WHERE id IN (${placeholders})`)
    .run(...ids) as { changes: number }

  return Number(result.changes ?? 0)
}

export function deleteByStatus(status: ItemStatus): number {
  const result = db
    .query(`DELETE FROM items WHERE status = ?`)
    .run(status) as { changes: number }

  return Number(result.changes ?? 0)
}

export function updateItem(id: number, fields: UpdateItemInput): PocketItem | null {
  const existingItem = getItemById(id)
  if (!existingItem) {
    return null
  }

  const assignments: string[] = []
  const values: Array<string | number | null> = []

  if (fields.title !== undefined) {
    assignments.push('title = ?')
    values.push(fields.title)
  }

  if (fields.tags !== undefined) {
    assignments.push('tags = ?')
    values.push(fields.tags)
  }

  if (fields.status !== undefined) {
    assignments.push('status = ?')
    values.push(fields.status)

    if (fields.status !== existingItem.status) {
      assignments.push('archived_at = ?')
      values.push(fields.status === 'archive' ? Math.floor(Date.now() / 1000) : null)
    }
  }

  if (fields.validation_status !== undefined) {
    assignments.push('validation_status = ?')
    values.push(fields.validation_status ?? null)
  }

  if (fields.validation_checked_at !== undefined) {
    assignments.push('validation_checked_at = ?')
    values.push(fields.validation_checked_at ?? null)
  }

  if (assignments.length === 0) {
    return getItemById(id)
  }

  values.push(id)

  db.query(`
    UPDATE items
    SET ${assignments.join(', ')}
    WHERE id = ?
  `).run(...values)

  return getItemById(id)
}

export function importItems(items: ImportItemInput[]): ImportSummary {
  const insertStatement = db.query(`
    INSERT OR IGNORE INTO items (
      title,
      url,
      time_added,
      tags,
      status,
      archived_at,
      validation_status,
      validation_checked_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  let insertedCount = 0
  let duplicateCount = 0

  const importTransaction = db.transaction((rows: ImportItemInput[]) => {
    for (const item of rows) {
      const result = insertStatement.run(
        item.title,
        item.url,
        item.time_added,
        item.tags,
        item.status,
        item.archived_at ?? null,
        item.validation_status ?? null,
        item.validation_checked_at ?? null
      ) as { changes: number }

      if (Number(result.changes ?? 0) > 0) {
        insertedCount += 1
      } else {
        duplicateCount += 1
      }
    }
  })

  importTransaction(items)

  return {
    insertedCount,
    duplicateCount,
  }
}

export function getItemCount(): number {
  const row = db.query(`SELECT COUNT(*) as count FROM items`).get() as { count: number }
  return Number(row.count)
}
