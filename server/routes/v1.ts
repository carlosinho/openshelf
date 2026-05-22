import { Hono } from 'hono'
import { requireApiKey } from '../api-key'
import { CreateItemError, createItemFromUrl } from '../create-item'

export const v1Routes = new Hono()

v1Routes.use('*', requireApiKey)

v1Routes.post('/items', async (c) => {
  const body = await c.req.json<{ url?: string }>()

  try {
    const item = await createItemFromUrl({
      url: body.url ?? '',
      status: 'unread',
    })

    return c.json(item, 201)
  } catch (error) {
    if (error instanceof CreateItemError) {
      return c.json({ error: error.message }, error.status)
    }

    throw error
  }
})
