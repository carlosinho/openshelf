import { Hono } from 'hono'
import {
  deleteAllAppLogs,
  deleteAppLogsOlderThanMonths,
  isAppLoggingEnabled,
  listAppLogs,
  setAppLoggingEnabled,
} from '../db'

const DEFAULT_LOG_LIMIT = 200
const PRUNE_MONTHS = 6

export const logsRoutes = new Hono()

logsRoutes.get('/', (c) => {
  const limitParam = c.req.query('limit')
  const limit = limitParam ? Number.parseInt(limitParam, 10) : DEFAULT_LOG_LIMIT

  return c.json({
    logs: listAppLogs(Number.isNaN(limit) ? DEFAULT_LOG_LIMIT : limit),
    logging_enabled: isAppLoggingEnabled(),
  })
})

logsRoutes.patch('/settings', async (c) => {
  const body = await c.req.json<{ logging_enabled?: boolean }>()

  if (typeof body.logging_enabled !== 'boolean') {
    return c.json({ error: 'logging_enabled must be a boolean.' }, 400)
  }

  setAppLoggingEnabled(body.logging_enabled)

  return c.json({
    logging_enabled: body.logging_enabled,
  })
})

logsRoutes.delete('/', (c) => {
  const deleted = deleteAllAppLogs()

  return c.json({
    ok: true,
    deleted,
  })
})

logsRoutes.post('/prune', (c) => {
  const deleted = deleteAppLogsOlderThanMonths(PRUNE_MONTHS)

  return c.json({
    ok: true,
    deleted,
    older_than_months: PRUNE_MONTHS,
  })
})
