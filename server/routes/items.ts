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

const TWITTER_TITLE_MAX_LENGTH = 70
const REDDIT_REQUEST_USER_AGENT = 'OpenShelf/0.50 (+self-hosted read-later app)'

function extractFirstMatch(html: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) {
      return match[1]
    }
  }

  return null
}

function decodeHtmlEntities(value: string) {
  const namedEntities: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
  }

  return value.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (entity, code) => {
    const normalizedCode = String(code).toLowerCase()

    if (normalizedCode.startsWith('#x')) {
      const parsed = Number.parseInt(normalizedCode.slice(2), 16)
      return Number.isNaN(parsed) ? entity : String.fromCodePoint(parsed)
    }

    if (normalizedCode.startsWith('#')) {
      const parsed = Number.parseInt(normalizedCode.slice(1), 10)
      return Number.isNaN(parsed) ? entity : String.fromCodePoint(parsed)
    }

    return namedEntities[normalizedCode] ?? entity
  })
}

function normalizeText(value: string) {
  return decodeHtmlEntities(value).replace(/\s+/g, ' ').trim()
}

function stripHtmlTags(value: string) {
  return value.replace(/<[^>]+>/g, ' ')
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength - 3).trimEnd()}...`
}

function extractTitle(html: string) {
  const rawTitle = extractFirstMatch(html, [
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+name=["']title["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<title[^>]*>([^<]+)<\/title>/i,
  ])

  if (!rawTitle) {
    return null
  }

  const title = normalizeText(rawTitle)
  return title || null
}

function isTwitterStatusUrl(url: string) {
  try {
    const parsedUrl = new URL(url)
    const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, '')

    return (hostname === 'twitter.com' || hostname === 'x.com') && /\/status\/\d+/i.test(parsedUrl.pathname)
  } catch {
    return false
  }
}

function isRedditUrl(url: string) {
  try {
    const parsedUrl = new URL(url)
    const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, '')

    return hostname === 'reddit.com' || hostname.endsWith('.reddit.com')
  } catch {
    return false
  }
}

function getTwitterOEmbedUrl(url: string) {
  const parsedUrl = new URL(url)
  const lookupUrl = new URL(parsedUrl.toString())
  lookupUrl.hostname = 'twitter.com'

  return `https://publish.twitter.com/oembed?omit_script=1&url=${encodeURIComponent(lookupUrl.toString())}`
}

function getRedditOEmbedUrl(url: string) {
  const parsedUrl = new URL(url)
  const lookupUrl = new URL(parsedUrl.toString())
  lookupUrl.hostname = 'www.reddit.com'

  return `https://www.reddit.com/oembed?url=${encodeURIComponent(lookupUrl.toString())}`
}

function extractTwitterStatusTitleFromEmbedHtml(html: string) {
  const rawTweetHtml = extractFirstMatch(html, [/<p\b[^>]*>([\s\S]*?)<\/p>/i])

  if (!rawTweetHtml) {
    return null
  }

  const tweetText = normalizeText(stripHtmlTags(rawTweetHtml))
  if (!tweetText) {
    return null
  }

  return truncateText(tweetText, TWITTER_TITLE_MAX_LENGTH)
}

async function fetchTwitterStatusTitle(url: string) {
  try {
    const response = await fetch(getTwitterOEmbedUrl(url))
    if (!response.ok) {
      return null
    }

    const payload = (await response.json()) as { html?: string }
    if (!payload.html) {
      return null
    }

    return extractTwitterStatusTitleFromEmbedHtml(payload.html)
  } catch {
    return null
  }
}

async function fetchRedditTitle(url: string) {
  try {
    const response = await fetch(getRedditOEmbedUrl(url), {
      headers: {
        'User-Agent': REDDIT_REQUEST_USER_AGENT,
      },
    })

    if (!response.ok) {
      return null
    }

    const payload = (await response.json()) as { title?: string }
    const title = payload.title ? normalizeText(payload.title) : ''
    return title || null
  } catch {
    return null
  }
}

async function fetchPageTitle(url: string) {
  try {
    if (isTwitterStatusUrl(url)) {
      const twitterTitle = await fetchTwitterStatusTitle(url)
      if (twitterTitle) {
        return twitterTitle
      }
    }

    if (isRedditUrl(url)) {
      const redditTitle = await fetchRedditTitle(url)
      if (redditTitle) {
        return redditTitle
      }
    }

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
