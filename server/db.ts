import { mkdirSync } from 'fs'
import { join } from 'path'
import { Database } from 'bun:sqlite'
import { getRootDomainFromUrl, getRootDomainFromHostname } from '../src/lib/domain'
import type { AppLogEntry, InsertAppLogInput } from '../src/types/app-log'
import type { PersonalizationSettings } from '../src/types/settings'
import type { PocketItem, Shelf } from '../src/types/pocket'
import {
  deleteCustomLogoFiles,
  hasCustomLogo,
  resolveDisplayName,
} from './personalization'

export type { InsertAppLogInput }

export type ItemStatus = PocketItem['status']
export type ValidationStatus = PocketItem['validation_status']
export type ImportItemInput = Omit<PocketItem, 'id' | 'shelf_ids'>

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

export interface ValidationCandidate {
  id: number
  url: string
  status: ItemStatus
}

export interface ValidationBatchUpdate {
  id: number
  validation_status: Extract<ValidationStatus, 'valid' | 'problem'>
  validation_checked_at: number
}

export interface AddShelfDomainResult {
  domain: string
  linkedItems: number
  linkedItemIds: number[]
}

interface BaseItemRecord {
  id: number
  title: string
  url: string
  time_added: number
  tags: string
  status: ItemStatus
  archived_at?: number
  validation_status?: ValidationStatus
  validation_checked_at?: number
}

interface ShelfItemRow {
  shelf_id: number
  item_id: number
}

interface ShelfDomainRuleRow {
  shelf_id: number
  domain: string
}

const dataDirectory = join(process.cwd(), 'data')
mkdirSync(dataDirectory, { recursive: true })

const databasePath = join(dataDirectory, 'openshelf.db')
const db = new Database(databasePath, { create: true })

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

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

  CREATE TABLE IF NOT EXISTS shelves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS shelf_items (
    shelf_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (shelf_id, item_id),
    FOREIGN KEY (shelf_id) REFERENCES shelves(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS shelf_domain_rules (
    shelf_id INTEGER NOT NULL,
    domain TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (shelf_id, domain),
    FOREIGN KEY (shelf_id) REFERENCES shelves(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_shelf_items_item_id ON shelf_items(item_id);
  CREATE INDEX IF NOT EXISTS idx_shelf_domain_rules_domain ON shelf_domain_rules(domain);

  CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    api_key TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS app_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at INTEGER NOT NULL,
    action TEXT NOT NULL,
    outcome TEXT CHECK(outcome IN ('success', 'failure')) NOT NULL,
    summary TEXT NOT NULL,
    details TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_app_logs_created_at ON app_logs(created_at);

  CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    logging_enabled INTEGER NOT NULL DEFAULT 0 CHECK (logging_enabled IN (0, 1)),
    display_name TEXT,
    logo_updated_at INTEGER
  );
`)

ensureAppSettingsColumns()

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

function getCurrentTimestamp() {
  return Math.floor(Date.now() / 1000)
}

function ensureAppSettingsColumns() {
  const columns = db
    .query(`PRAGMA table_info(app_settings)`)
    .all() as { name: string }[]

  const columnNames = new Set(columns.map((column) => column.name))

  if (!columnNames.has('display_name')) {
    db.exec(`ALTER TABLE app_settings ADD COLUMN display_name TEXT`)
  }

  if (!columnNames.has('logo_updated_at')) {
    db.exec(`ALTER TABLE app_settings ADD COLUMN logo_updated_at INTEGER`)
  }
}

function mapItemRow(row: Record<string, unknown> | null): BaseItemRecord | null {
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
    validation_checked_at:
      row.validation_checked_at == null ? undefined : Number(row.validation_checked_at),
  }
}

function getExplicitShelfRows(): ShelfItemRow[] {
  return db
    .query(`SELECT shelf_id, item_id FROM shelf_items`)
    .all() as ShelfItemRow[]
}

function getShelfDomainRuleRows(): ShelfDomainRuleRow[] {
  return db
    .query(`SELECT shelf_id, domain FROM shelf_domain_rules`)
    .all() as ShelfDomainRuleRow[]
}

function attachShelfIds(items: BaseItemRecord[]): PocketItem[] {
  if (items.length === 0) {
    return []
  }

  const shelfIdsByItem = new Map<number, Set<number>>()

  for (const row of getExplicitShelfRows()) {
    const existing = shelfIdsByItem.get(row.item_id) ?? new Set<number>()
    existing.add(Number(row.shelf_id))
    shelfIdsByItem.set(Number(row.item_id), existing)
  }

  const shelfIdsByDomain = new Map<string, Set<number>>()
  for (const row of getShelfDomainRuleRows()) {
    const domain = String(row.domain)
    const existing = shelfIdsByDomain.get(domain) ?? new Set<number>()
    existing.add(Number(row.shelf_id))
    shelfIdsByDomain.set(domain, existing)
  }

  return items.map((item) => {
    const shelfIds = new Set<number>(shelfIdsByItem.get(item.id) ?? [])
    const rootDomain = getRootDomainFromUrl(item.url)

    if (rootDomain) {
      for (const shelfId of shelfIdsByDomain.get(rootDomain) ?? []) {
        shelfIds.add(shelfId)
      }
    }

    return {
      ...item,
      shelf_ids: Array.from(shelfIds).sort((left, right) => left - right),
    }
  })
}

function mapShelfRows(rows: Array<Record<string, unknown>>): Shelf[] {
  const domainsByShelfId = new Map<number, string[]>()

  for (const row of getShelfDomainRuleRows()) {
    const shelfId = Number(row.shelf_id)
    const domains = domainsByShelfId.get(shelfId) ?? []
    domains.push(String(row.domain))
    domainsByShelfId.set(shelfId, domains)
  }

  return rows.map((row) => {
    const id = Number(row.id)

    return {
      id,
      name: String(row.name),
      created_at: Number(row.created_at),
      updated_at: Number(row.updated_at),
      domains: (domainsByShelfId.get(id) ?? []).slice().sort((left, right) => left.localeCompare(right)),
    }
  })
}

function normalizeShelfName(name: string) {
  return name.trim()
}

function normalizeShelfDomain(domain: string) {
  const normalized = getRootDomainFromHostname(domain)

  if (!normalized) {
    throw new Error('Please provide a valid domain.')
  }

  return normalized
}

function ensureShelfExists(shelfId: number) {
  if (!getShelfById(shelfId)) {
    throw new Error('Shelf not found.')
  }
}

function backfillShelfItemsForDomain(shelfId: number, domain: string) {
  const itemRows = db.query(`SELECT id, url FROM items`).all() as Array<{ id: number; url: string }>
  const insertStatement = db.query(`
    INSERT OR IGNORE INTO shelf_items (shelf_id, item_id, created_at)
    VALUES (?, ?, ?)
  `)

  const linkedItemIds: number[] = []

  const transaction = db.transaction((rows: Array<{ id: number; url: string }>) => {
    for (const row of rows) {
      if (getRootDomainFromUrl(String(row.url)) !== domain) {
        continue
      }

      const result = insertStatement.run(shelfId, Number(row.id), getCurrentTimestamp()) as {
        changes: number
      }

      if (Number(result.changes ?? 0) > 0) {
        linkedItemIds.push(Number(row.id))
      }
    }
  })

  transaction(itemRows)
  return linkedItemIds
}

function applyDomainShelvesToItem(itemId: number, url: string) {
  const domain = getRootDomainFromUrl(url)

  if (!domain) {
    return 0
  }

  const ruleRows = db
    .query(`SELECT shelf_id FROM shelf_domain_rules WHERE domain = ?`)
    .all(domain) as Array<{ shelf_id: number }>

  if (ruleRows.length === 0) {
    return 0
  }

  const insertStatement = db.query(`
    INSERT OR IGNORE INTO shelf_items (shelf_id, item_id, created_at)
    VALUES (?, ?, ?)
  `)

  let linkedItems = 0
  const now = getCurrentTimestamp()

  for (const row of ruleRows) {
    const result = insertStatement.run(Number(row.shelf_id), itemId, now) as { changes: number }
    linkedItems += Number(result.changes ?? 0)
  }

  return linkedItems
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

  const items = rows.map((row) => mapItemRow(row)).filter((item): item is BaseItemRecord => item !== null)
  return attachShelfIds(items)
}

export function getItemById(id: number): PocketItem | null {
  const row = db
    .query(`${baseSelect} WHERE id = ? LIMIT 1`)
    .get(id) as Record<string, unknown> | null

  const item = mapItemRow(row)
  return item ? attachShelfIds([item])[0] ?? null : null
}

export function getItemByUrl(url: string): PocketItem | null {
  const row = db
    .query(`${baseSelect} WHERE url = ? LIMIT 1`)
    .get(url) as Record<string, unknown> | null

  const item = mapItemRow(row)
  return item ? attachShelfIds([item])[0] ?? null : null
}

export function getItemsForValidation(ids: number[]): ValidationCandidate[] {
  const uniqueIds = Array.from(new Set(ids.filter((id) => Number.isInteger(id))))

  if (uniqueIds.length === 0) {
    return []
  }

  const placeholders = uniqueIds.map(() => '?').join(', ')
  const rows = db
    .query(`SELECT id, url, status FROM items WHERE id IN (${placeholders})`)
    .all(...uniqueIds) as Array<Record<string, unknown>>

  return rows
    .map((row) => {
      const id = Number(row.id)
      const url = typeof row.url === 'string' ? row.url : ''
      const status = row.status === 'archive' ? 'archive' : row.status === 'unread' ? 'unread' : null

      if (!Number.isInteger(id) || !url || !status) {
        return null
      }

      return {
        id,
        url,
        status,
      }
    })
    .filter((item): item is ValidationCandidate => item !== null)
}

export function addItem(input: CreateItemInput): PocketItem {
  const archivedAt = input.archived_at ?? (input.status === 'archive' ? getCurrentTimestamp() : null)
  const insertResult = db
    .query(`
      INSERT INTO items (title, url, time_added, tags, status, archived_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .run(
      input.title,
      input.url,
      input.time_added ?? getCurrentTimestamp(),
      input.tags ?? '',
      input.status ?? 'unread',
      archivedAt
    ) as { lastInsertRowid: number | bigint }

  const id = Number(insertResult.lastInsertRowid)
  applyDomainShelvesToItem(id, input.url)

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
  const result = db.query(`DELETE FROM items WHERE status = ?`).run(status) as { changes: number }
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
      values.push(fields.status === 'archive' ? getCurrentTimestamp() : null)
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

export function updateItemsValidation(updates: ValidationBatchUpdate[]) {
  if (updates.length === 0) {
    return 0
  }

  const updateStatement = db.query(`
    UPDATE items
    SET validation_status = ?, validation_checked_at = ?
    WHERE id = ?
  `)

  let updatedCount = 0

  const transaction = db.transaction((rows: ValidationBatchUpdate[]) => {
    for (const row of rows) {
      const result = updateStatement.run(
        row.validation_status,
        row.validation_checked_at,
        row.id
      ) as { changes: number }

      updatedCount += Number(result.changes ?? 0)
    }
  })

  transaction(updates)
  return updatedCount
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
  const insertedRows: Array<{ id: number; url: string }> = []

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
      ) as { changes: number; lastInsertRowid: number | bigint }

      if (Number(result.changes ?? 0) > 0) {
        insertedCount += 1
        insertedRows.push({
          id: Number(result.lastInsertRowid),
          url: item.url,
        })
      } else {
        duplicateCount += 1
      }
    }
  })

  importTransaction(items)

  for (const row of insertedRows) {
    applyDomainShelvesToItem(row.id, row.url)
  }

  return {
    insertedCount,
    duplicateCount,
  }
}

export function getAllShelves(): Shelf[] {
  const rows = db
    .query(`SELECT id, name, created_at, updated_at FROM shelves ORDER BY name COLLATE NOCASE ASC, id ASC`)
    .all() as Array<Record<string, unknown>>

  return mapShelfRows(rows)
}

export function getShelfById(id: number): Shelf | null {
  const row = db
    .query(`SELECT id, name, created_at, updated_at FROM shelves WHERE id = ? LIMIT 1`)
    .get(id) as Record<string, unknown> | null

  if (!row) {
    return null
  }

  return mapShelfRows([row])[0] ?? null
}

export function createShelf(name: string): Shelf {
  const normalizedName = normalizeShelfName(name)
  const now = getCurrentTimestamp()
  const result = db
    .query(`
      INSERT INTO shelves (name, created_at, updated_at)
      VALUES (?, ?, ?)
    `)
    .run(normalizedName, now, now) as { lastInsertRowid: number | bigint }

  const created = getShelfById(Number(result.lastInsertRowid))

  if (!created) {
    throw new Error('Failed to load created shelf from database.')
  }

  return created
}

export function renameShelf(id: number, name: string): Shelf | null {
  if (!getShelfById(id)) {
    return null
  }

  db.query(`
    UPDATE shelves
    SET name = ?, updated_at = ?
    WHERE id = ?
  `).run(normalizeShelfName(name), getCurrentTimestamp(), id)

  return getShelfById(id)
}

export function deleteShelf(id: number): number {
  const result = db.query(`DELETE FROM shelves WHERE id = ?`).run(id) as { changes: number }
  return Number(result.changes ?? 0)
}

export interface AddItemsToShelfResult {
  added: number
  addedItemIds: number[]
}

export function addItemsToShelf(shelfId: number, itemIds: number[]): AddItemsToShelfResult {
  ensureShelfExists(shelfId)

  const uniqueItemIds = Array.from(new Set(itemIds.filter((id) => Number.isInteger(id) && id > 0)))

  if (uniqueItemIds.length === 0) {
    return { added: 0, addedItemIds: [] }
  }

  const insertStatement = db.query(`
    INSERT OR IGNORE INTO shelf_items (shelf_id, item_id, created_at)
    VALUES (?, ?, ?)
  `)

  const addedItemIds: number[] = []
  const now = getCurrentTimestamp()

  const transaction = db.transaction((ids: number[]) => {
    for (const itemId of ids) {
      const result = insertStatement.run(shelfId, itemId, now) as { changes: number }

      if (Number(result.changes ?? 0) > 0) {
        addedItemIds.push(itemId)
      }
    }
  })

  transaction(uniqueItemIds)

  return {
    added: addedItemIds.length,
    addedItemIds,
  }
}

export function removeItemFromShelf(shelfId: number, itemId: number): number {
  const result = db
    .query(`DELETE FROM shelf_items WHERE shelf_id = ? AND item_id = ?`)
    .run(shelfId, itemId) as { changes: number }

  return Number(result.changes ?? 0)
}

export function addDomainRuleToShelf(shelfId: number, domain: string): AddShelfDomainResult {
  ensureShelfExists(shelfId)

  const normalizedDomain = normalizeShelfDomain(domain)
  db.query(`
    INSERT OR IGNORE INTO shelf_domain_rules (shelf_id, domain, created_at)
    VALUES (?, ?, ?)
  `).run(shelfId, normalizedDomain, getCurrentTimestamp())

  const linkedItemIds = backfillShelfItemsForDomain(shelfId, normalizedDomain)

  return {
    domain: normalizedDomain,
    linkedItems: linkedItemIds.length,
    linkedItemIds,
  }
}

export function deleteDomainRuleFromShelf(shelfId: number, domain: string): number {
  const normalizedDomain = normalizeShelfDomain(domain)
  const result = db
    .query(`DELETE FROM shelf_domain_rules WHERE shelf_id = ? AND domain = ?`)
    .run(shelfId, normalizedDomain) as { changes: number }

  return Number(result.changes ?? 0)
}

export interface ApiKeyRecord {
  api_key: string
  created_at: number
}

export function getApiKeyRecord(): ApiKeyRecord | null {
  const row = db
    .query(`SELECT api_key, created_at FROM api_keys WHERE id = 1`)
    .get() as Record<string, unknown> | null

  if (!row || typeof row.api_key !== 'string' || !row.api_key) {
    return null
  }

  const createdAt = Number(row.created_at)
  if (!Number.isInteger(createdAt)) {
    return null
  }

  return {
    api_key: row.api_key,
    created_at: createdAt,
  }
}

export function setApiKey(apiKey: string): ApiKeyRecord {
  const createdAt = getCurrentTimestamp()

  db.query(
    `
      INSERT INTO api_keys (id, api_key, created_at)
      VALUES (1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        api_key = excluded.api_key,
        created_at = excluded.created_at
    `
  ).run(apiKey, createdAt)

  return {
    api_key: apiKey,
    created_at: createdAt,
  }
}

export function clearApiKey(): boolean {
  const result = db.query(`DELETE FROM api_keys WHERE id = 1`).run() as { changes: number }
  return Number(result.changes ?? 0) > 0
}

export function getItemCount(): number {
  const row = db.query(`SELECT COUNT(*) as count FROM items`).get() as { count: number }
  return Number(row.count)
}

function serializeAppLogDetails(details?: Record<string, unknown>) {
  if (!details || Object.keys(details).length === 0) {
    return null
  }

  return JSON.stringify(details)
}

export function isAppLoggingEnabled(): boolean {
  const row = db
    .query(`SELECT logging_enabled FROM app_settings WHERE id = 1`)
    .get() as { logging_enabled: number } | null

  if (!row) {
    return false
  }

  return Number(row.logging_enabled) === 1
}

export function setAppLoggingEnabled(enabled: boolean) {
  db.query(
    `
      INSERT INTO app_settings (id, logging_enabled)
      VALUES (1, ?)
      ON CONFLICT(id) DO UPDATE SET
        logging_enabled = excluded.logging_enabled
    `
  ).run(enabled ? 1 : 0)
}

function getAppSettingsRow() {
  return db
    .query(
      `
        SELECT logging_enabled, display_name, logo_updated_at
        FROM app_settings
        WHERE id = 1
      `
    )
    .get() as
    | {
        logging_enabled: number
        display_name: string | null
        logo_updated_at: number | null
      }
    | null
}

export function getPersonalization(): PersonalizationSettings {
  const row = getAppSettingsRow()
  const logoUpdatedAt =
    row?.logo_updated_at == null ? null : Number(row.logo_updated_at)

  return {
    display_name: resolveDisplayName(row?.display_name),
    has_custom_logo: hasCustomLogo(),
    logo_updated_at: hasCustomLogo() ? logoUpdatedAt : null,
  }
}

export function setDisplayName(displayName: string) {
  const existing = getAppSettingsRow()
  const loggingEnabled = existing ? Number(existing.logging_enabled) === 1 : false
  const logoUpdatedAt = existing?.logo_updated_at ?? null

  db.query(
    `
      INSERT INTO app_settings (id, logging_enabled, display_name, logo_updated_at)
      VALUES (1, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        display_name = excluded.display_name
    `
  ).run(loggingEnabled ? 1 : 0, displayName || null, logoUpdatedAt)
}

export function touchCustomLogo() {
  const timestamp = getCurrentTimestamp()
  const existing = getAppSettingsRow()
  const loggingEnabled = existing ? Number(existing.logging_enabled) === 1 : false
  const displayName = existing?.display_name ?? null

  db.query(
    `
      INSERT INTO app_settings (id, logging_enabled, display_name, logo_updated_at)
      VALUES (1, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        logo_updated_at = excluded.logo_updated_at
    `
  ).run(loggingEnabled ? 1 : 0, displayName, timestamp)
}

export function clearCustomLogo() {
  deleteCustomLogoFiles()

  const existing = getAppSettingsRow()
  const loggingEnabled = existing ? Number(existing.logging_enabled) === 1 : false
  const displayName = existing?.display_name ?? null

  db.query(
    `
      INSERT INTO app_settings (id, logging_enabled, display_name, logo_updated_at)
      VALUES (1, ?, ?, NULL)
      ON CONFLICT(id) DO UPDATE SET
        logo_updated_at = NULL
    `
  ).run(loggingEnabled ? 1 : 0, displayName)
}

export function insertAppLog(input: InsertAppLogInput) {
  db.query(
    `
      INSERT INTO app_logs (created_at, action, outcome, summary, details)
      VALUES (?, ?, ?, ?, ?)
    `
  ).run(
    getCurrentTimestamp(),
    input.action,
    input.outcome,
    input.summary,
    serializeAppLogDetails(input.details)
  )
}

export function listAppLogs(limit = 200): AppLogEntry[] {
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 500)
  const rows = db
    .query(
      `
        SELECT id, created_at, action, outcome, summary, details
        FROM app_logs
        ORDER BY created_at DESC, id DESC
        LIMIT ?
      `
    )
    .all(safeLimit) as Array<Record<string, unknown>>

  return rows.map((row) => ({
    id: Number(row.id),
    created_at: Number(row.created_at),
    action: String(row.action) as AppLogEntry['action'],
    outcome: row.outcome as AppLogEntry['outcome'],
    summary: String(row.summary),
    details: row.details == null ? undefined : String(row.details),
  }))
}

export function deleteAllAppLogs(): number {
  const result = db.query(`DELETE FROM app_logs`).run() as { changes: number }
  return Number(result.changes ?? 0)
}

const APP_LOG_PRUNE_MONTH_SECONDS = 30 * 24 * 60 * 60

export function deleteAppLogsOlderThanMonths(months: number): number {
  const safeMonths = Math.max(Math.floor(months), 1)
  const cutoff = getCurrentTimestamp() - safeMonths * APP_LOG_PRUNE_MONTH_SECONDS
  const result = db
    .query(`DELETE FROM app_logs WHERE created_at < ?`)
    .run(cutoff) as { changes: number }

  return Number(result.changes ?? 0)
}
