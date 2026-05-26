import { Hono } from 'hono'
import { recordAppLog } from '../app-log'
import { combineCSVResults, exportPocketCSV, parseImportCSVText, type ImportSource } from '../csv'
import { createDatabaseBackup, getAllItems, importItems } from '../db'

export const importRoutes = new Hono()

importRoutes.post('/import', async (c) => {
  const formData = await c.req.formData()
  const sourceValue = formData.get('source')
  const source: ImportSource | null =
    sourceValue === null
      ? 'pocket'
      : sourceValue === 'instapaper' ||
          sourceValue === 'matter' ||
          sourceValue === 'pocket' ||
          sourceValue === 'raindrop'
        ? sourceValue
        : null

  if (!source) {
    recordAppLog({
      action: 'import.failed',
      outcome: 'failure',
      summary: 'Import failed: unsupported import source.',
      details: { source: String(sourceValue) },
    })

    return c.json({ error: 'Unsupported import source.' }, 400)
  }

  const files = formData
    .getAll('files')
    .filter((value): value is File => value instanceof File)

  if (files.length === 0) {
    recordAppLog({
      action: 'import.failed',
      outcome: 'failure',
      summary: 'Import failed: no CSV files uploaded.',
      details: { source },
    })

    return c.json({ error: 'Please upload at least one CSV file.' }, 400)
  }

  const parsedResults = await Promise.all(
    files.map(async (file) => parseImportCSVText(await file.text(), file.name, source))
  )

  const combined = parsedResults.length === 1 ? parsedResults[0] : combineCSVResults(parsedResults)
  const importSummary = importItems(combined.data)
  const errorCount = combined.errors.length

  recordAppLog({
    action: 'import.completed',
    outcome: 'success',
    summary: `Imported ${importSummary.insertedCount} link${importSummary.insertedCount === 1 ? '' : 's'} from ${source} (${importSummary.duplicateCount} duplicate${importSummary.duplicateCount === 1 ? '' : 's'}, ${errorCount} row error${errorCount === 1 ? '' : 's'}).`,
    details: {
      source,
      file_count: files.length,
      imported: importSummary.insertedCount,
      duplicates: importSummary.duplicateCount,
      errors: errorCount,
    },
  })

  return c.json({
    ok: true,
    imported: importSummary.insertedCount,
    duplicates: importSummary.duplicateCount,
    errors: combined.errors,
  })
})

importRoutes.get('/export', (c) => {
  const scope = c.req.query('scope') ?? 'all'
  const items = getAllItems()

  const scopedItems =
    scope === 'archive' || scope === 'unread'
      ? items.filter((item) => item.status === scope)
      : items

  const csv = exportPocketCSV(
    scopedItems.map(({ id: _id, ...item }) => item)
  )

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="openshelf-${scope}.csv"`,
    },
  })
})

importRoutes.get('/backup', () => {
  const backup = createDatabaseBackup()
  const body = new ArrayBuffer(backup.byteLength)
  new Uint8Array(body).set(backup)

  return new Response(body, {
    headers: {
      'Content-Type': 'application/vnd.sqlite3',
      'Content-Disposition': 'attachment; filename="openshelf.db"',
      'Content-Length': String(backup.byteLength),
    },
  })
})
