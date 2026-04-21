import { Hono } from 'hono'
import { combineCSVResults, exportPocketCSV, parsePocketCSVText } from '../csv'
import { createDatabaseBackup, getAllItems, importItems } from '../db'

export const importRoutes = new Hono()

importRoutes.post('/import', async (c) => {
  const formData = await c.req.formData()
  const files = formData
    .getAll('files')
    .filter((value): value is File => value instanceof File)

  if (files.length === 0) {
    return c.json({ error: 'Please upload at least one CSV file.' }, 400)
  }

  const parsedResults = await Promise.all(
    files.map(async (file) => parsePocketCSVText(await file.text(), file.name))
  )

  const combined = parsedResults.length === 1 ? parsedResults[0] : combineCSVResults(parsedResults)
  const importSummary = importItems(combined.data)

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
