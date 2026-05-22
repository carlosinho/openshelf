import { addItem, getItemByUrl, type CreateItemInput, type ItemStatus } from './db'
import { OPENSHELF_HTTP_USER_AGENT } from './http-user-agent'
import { normalizeUrl } from './url'
import type { PocketItem } from '../src/types/pocket'

const TWITTER_TITLE_MAX_LENGTH = 70
const TITLE_FETCH_TIMEOUT_MS = 8000

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
    return await fetchTitleWithTimeout(getTwitterOEmbedUrl(url), async (response) => {
      if (!response.ok) {
        return null
      }

      const payload = (await response.json()) as { html?: string }
      if (!payload.html) {
        return null
      }

      return extractTwitterStatusTitleFromEmbedHtml(payload.html)
    })
  } catch {
    return null
  }
}

async function fetchRedditTitle(url: string) {
  try {
    return await fetchTitleWithTimeout(
      getRedditOEmbedUrl(url),
      async (response) => {
        if (!response.ok) {
          return null
        }

        const payload = (await response.json()) as { title?: string }
        const title = payload.title ? normalizeText(payload.title) : ''
        return title || null
      },
      {
        headers: {
          'User-Agent': OPENSHELF_HTTP_USER_AGENT,
        },
      }
    )
  } catch {
    return null
  }
}

async function fetchTitleWithTimeout<T>(
  url: string,
  readResponse: (response: Response) => Promise<T>,
  init: RequestInit = {}
) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, TITLE_FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
    })

    return await readResponse(response)
  } finally {
    clearTimeout(timeoutId)
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

    return await fetchTitleWithTimeout(url, async (response) => {
      if (!response.ok) {
        return null
      }

      const html = await response.text()
      return extractTitle(html)
    })
  } catch {
    return null
  }
}

export type CreateItemErrorCode = 'missing_url' | 'invalid_url' | 'duplicate'
export type CreateItemStatusCode = 400 | 409

export class CreateItemError extends Error {
  code: CreateItemErrorCode
  status: CreateItemStatusCode

  constructor(code: CreateItemErrorCode, message: string, status: CreateItemStatusCode) {
    super(message)
    this.name = 'CreateItemError'
    this.code = code
    this.status = status
  }
}

export interface CreateItemFromUrlInput {
  url: string
  title?: string
  tags?: string
  status?: ItemStatus
}

export async function createItemFromUrl(input: CreateItemFromUrlInput): Promise<PocketItem> {
  const trimmedUrl = input.url.trim()

  if (!trimmedUrl) {
    throw new CreateItemError('missing_url', 'URL is required.', 400)
  }

  let normalizedUrl: string

  try {
    normalizedUrl = normalizeUrl(trimmedUrl)
  } catch {
    throw new CreateItemError('invalid_url', 'Please provide a valid URL.', 400)
  }

  if (getItemByUrl(normalizedUrl)) {
    throw new CreateItemError('duplicate', 'This URL is already in your list.', 409)
  }

  const fetchedTitle = input.title?.trim() || (await fetchPageTitle(normalizedUrl)) || normalizedUrl
  const createInput: CreateItemInput = {
    title: fetchedTitle,
    url: normalizedUrl,
    tags: input.tags?.trim() ?? '',
    status: input.status ?? 'unread',
  }

  return addItem(createInput)
}
