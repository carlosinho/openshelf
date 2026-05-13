import { Hono } from 'hono'
import {
  addItem,
  deleteByStatus,
  deleteItems,
  getAllItems,
  getItemsForValidation,
  getItemByUrl,
  updateItemsValidation,
  updateItem,
  type ItemStatus,
  type UpdateItemInput,
} from '../db'
import { normalizeUrl } from '../url'

const TWITTER_TITLE_MAX_LENGTH = 70
const REDDIT_REQUEST_USER_AGENT = 'OpenShelf/0.50 (+self-hosted read-later app)'
const URL_CHECK_REQUEST_USER_AGENT = 'OpenShelf/0.80 URL checker (+self-hosted read-later app)'
const URL_CHECK_TIMEOUT_MS = 8000
const URL_CHECK_BATCH_LIMIT = 10

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

function isValidUrlCheckStatus(status: number) {
  return status === 401 || status === 405 || status === 429
}

function isCloudflareChallengeResponse(response: Response, body?: string) {
  if (response.status !== 403) {
    return false
  }

  const cfMitigated = response.headers.get('cf-mitigated')?.toLowerCase()
  if (cfMitigated === 'challenge') {
    return true
  }

  const server = response.headers.get('server')?.toLowerCase() ?? ''
  const contentSecurityPolicy = response.headers.get('content-security-policy')?.toLowerCase() ?? ''
  const challengeBody = body?.toLowerCase() ?? ''

  if (server.includes('cloudflare')) {
    if (contentSecurityPolicy.includes('challenges.cloudflare.com')) {
      return true
    }

    if (
      challengeBody.includes('challenges.cloudflare.com') ||
      challengeBody.includes('attention required! | cloudflare') ||
      challengeBody.includes('cf-mitigated')
    ) {
      return true
    }
  }

  return false
}

async function fetchWithTimeout(url: string, method: 'GET' | 'HEAD') {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, URL_CHECK_TIMEOUT_MS)

  try {
    return await fetch(url, {
      method,
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': URL_CHECK_REQUEST_USER_AGENT,
      },
    })
  } finally {
    clearTimeout(timeoutId)
  }
}

async function checkUrl(url: string): Promise<Extract<UpdateItemInput['validation_status'], 'valid' | 'problem'>> {
  try {
    const headResponse = await fetchWithTimeout(url, 'HEAD')

    if (headResponse.ok || isValidUrlCheckStatus(headResponse.status)) {
      return 'valid'
    }

    if (isCloudflareChallengeResponse(headResponse)) {
      return 'valid'
    }

    if (headResponse.status === 404 || headResponse.status === 410) {
      return 'problem'
    }
  } catch {
    // Some servers handle HEAD badly; fall through to GET before declaring failure.
  }

  try {
    const getResponse = await fetchWithTimeout(url, 'GET')
    const responseText =
      getResponse.status === 403 ? await getResponse.text().catch(() => '') : undefined

    if (getResponse.ok || isValidUrlCheckStatus(getResponse.status)) {
      return 'valid'
    }

    if (isCloudflareChallengeResponse(getResponse, responseText)) {
      return 'valid'
    }

    return 'problem'
  } catch {
    return 'problem'
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

itemsRoutes.post('/check-urls', async (c) => {
  const body = await c.req.json<{ ids?: number[] }>()
  const ids = Array.isArray(body.ids)
    ? Array.from(new Set(body.ids.filter((id) => Number.isInteger(id))))
    : []

  if (ids.length > URL_CHECK_BATCH_LIMIT) {
    return c.json({ error: `URL check batches are limited to ${URL_CHECK_BATCH_LIMIT} items.` }, 400)
  }

  const itemsToCheck = getItemsForValidation(ids).filter((item) => item.status === 'unread')
  const checkedAt = Date.now()

  const results = await Promise.all(
    itemsToCheck.map(async (item) => ({
      id: item.id,
      status: await checkUrl(item.url),
    }))
  )

  updateItemsValidation(
    results.map((result) => ({
      id: result.id,
      validation_status: result.status,
      validation_checked_at: checkedAt,
    }))
  )

  return c.json({
    ok: true,
    checked: results.length,
    checked_at: checkedAt,
    results,
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
