import { Hono } from 'hono'
import { requireApiKey } from '../api-key'
import { recordAppLog } from '../app-log'
import { CreateItemError, createItemFromUrl } from '../create-item'

export const v1Routes = new Hono()

v1Routes.use('*', requireApiKey)

v1Routes.post('/items', async (c) => {
  const body = await c.req.json<{ url?: string }>()
  const url = body.url ?? ''

  try {
    const item = await createItemFromUrl({
      url,
      status: 'unread',
    })

    recordAppLog({
      action: 'item.added.remote',
      outcome: 'success',
      summary: `Added link via API: ${item.url}`,
      details: { id: item.id, url: item.url, source: 'api' },
    })

    return c.json(item, 201)
  } catch (error) {
    if (error instanceof CreateItemError) {
      recordAppLog({
        action: 'item.add.remote.failed',
        outcome: 'failure',
        summary: url
          ? `Failed to add link via API ${url}: ${error.message}`
          : `Failed to add link via API: ${error.message}`,
        details: { url, code: error.code, source: 'api' },
      })

      return c.json({ error: error.message }, error.status)
    }

    throw error
  }
})
