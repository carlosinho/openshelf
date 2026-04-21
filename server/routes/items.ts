import { Hono } from 'hono'
import {
  addItem,
  deleteByStatus,
  deleteItems,
  getAllItems,
  getItemByUrl,
  updateItem,
  type ItemStatus,
  type UpdateItemInput,
} from '../db'

function normalizeUrl(rawUrl: string) {
  const candidate = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`
  return new URL(candidate).toString()
}

function extractTitle(html: string) {
  const patterns = [
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+name=["']title["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<title[^>]*>([^<]+)<\/title>/i,
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) {
      const title = match[1].trim()
      if (title) {
        return title
      }
    }
  }

  return null
}

async function fetchPageTitle(url: string) {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      return null
    }

    const html = await response.text()
    return extractTitle(html)
  } catch {
    return null
  }
}

export const itemsRoutes = new Hono()

itemsRoutes.get('/', (c) => {
  return c.json(getAllItems())
})

itemsRoutes.post('/', async (c) => {
  const body = await c.req.json<{ url?: string; title?: string; tags?: string; status?: ItemStatus }>()

  if (!body.url?.trim()) {
    return c.json({ error: 'URL is required.' }, 400)
  }

  let normalizedUrl: string

  try {
    normalizedUrl = normalizeUrl(body.url.trim())
  } catch {
    return c.json({ error: 'Please provide a valid URL.' }, 400)
  }

  if (getItemByUrl(normalizedUrl)) {
    return c.json({ error: 'This URL is already in your list.' }, 409)
  }

  const fetchedTitle = body.title?.trim() || (await fetchPageTitle(normalizedUrl)) || normalizedUrl
  const item = addItem({
    title: fetchedTitle,
    url: normalizedUrl,
    tags: body.tags?.trim() ?? '',
    status: body.status ?? 'unread',
  })

  return c.json(item, 201)
})

itemsRoutes.delete('/:id', (c) => {
  const id = Number.parseInt(c.req.param('id'), 10)

  if (Number.isNaN(id)) {
    return c.json({ error: 'Invalid item id.' }, 400)
  }

  const deleted = deleteItems([id])

  if (deleted === 0) {
    return c.json({ error: 'Item not found.' }, 404)
  }

  return c.json({ ok: true, deleted })
})

itemsRoutes.post('/bulk-delete', async (c) => {
  const body = await c.req.json<{ ids?: number[] }>()
  const ids = Array.isArray(body.ids) ? body.ids.filter((id) => Number.isInteger(id)) : []

  return c.json({
    ok: true,
    deleted: deleteItems(ids),
  })
})

itemsRoutes.post('/clear-archived', (c) => {
  return c.json({
    ok: true,
    deleted: deleteByStatus('archive'),
  })
})

itemsRoutes.patch('/:id', async (c) => {
  const id = Number.parseInt(c.req.param('id'), 10)

  if (Number.isNaN(id)) {
    return c.json({ error: 'Invalid item id.' }, 400)
  }

  const body = await c.req.json<UpdateItemInput>()
  const updated = updateItem(id, body)

  if (!updated) {
    return c.json({ error: 'Item not found.' }, 404)
  }

  return c.json(updated)
})
