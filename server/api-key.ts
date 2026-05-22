import { timingSafeEqual } from 'crypto'
import { createMiddleware } from 'hono/factory'
import { getApiKeyRecord } from './db'

const API_KEY_PREFIX = 'os_'
const API_KEY_RANDOM_BYTES = 32

export function generateApiKeyToken() {
  const randomBytes = crypto.getRandomValues(new Uint8Array(API_KEY_RANDOM_BYTES))
  const encoded = Buffer.from(randomBytes).toString('base64url')
  return `${API_KEY_PREFIX}${encoded}`
}

function parseBearerToken(authorizationHeader: string | undefined) {
  if (!authorizationHeader) {
    return null
  }

  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i)
  const token = match?.[1]?.trim()

  return token || null
}

function isMatchingApiKey(provided: string, stored: string) {
  const providedBuffer = Buffer.from(provided)
  const storedBuffer = Buffer.from(stored)

  if (providedBuffer.length !== storedBuffer.length) {
    return false
  }

  return timingSafeEqual(providedBuffer, storedBuffer)
}

export function isValidApiKey(provided: string | null | undefined) {
  if (!provided) {
    return false
  }

  const record = getApiKeyRecord()
  if (!record) {
    return false
  }

  return isMatchingApiKey(provided, record.api_key)
}

export const requireApiKey = createMiddleware(async (c, next) => {
  const token = parseBearerToken(c.req.header('Authorization'))

  if (!isValidApiKey(token)) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  await next()
})
