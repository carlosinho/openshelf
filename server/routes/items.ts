import { Hono } from 'hono'
import { recordAppLog } from '../app-log'
import {
  deleteByStatus,
  deleteItems,
  getAllItems,
  getItemById,
  getItemsForValidation,
  updateItemsValidation,
  updateItem,
  type ItemStatus,
  type UpdateItemInput,
} from '../db'
import { CreateItemError, createItemFromUrl } from '../create-item'
import { OPENSHELF_URL_CHECK_USER_AGENT } from '../http-user-agent'

const URL_CHECK_TIMEOUT_MS = 8000
const URL_CHECK_BATCH_LIMIT = 10

function logItemDeleted(
  item: { id: number; url: string } | null,
  id: number
) {
  recordAppLog({
    action: 'item.deleted',
    outcome: 'success',
    summary: item ? `Deleted link: ${item.url}` : `Deleted link #${id}`,
    details: item ? { id, url: item.url } : { id },
  })
}

function logItemDeleteFailed(id: number, reason: string) {
  recordAppLog({
    action: 'item.delete.failed',
    outcome: 'failure',
    summary: `Failed to delete link: ${reason}`,
    details: { id },
  })
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
        'User-Agent': OPENSHELF_URL_CHECK_USER_AGENT,
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
  const url = body.url ?? ''

  try {
    const item = await createItemFromUrl({
      url,
      title: body.title,
      tags: body.tags,
      status: body.status,
    })

    recordAppLog({
      action: 'item.added',
      outcome: 'success',
      summary: `Added link: ${item.url}`,
      details: { id: item.id, url: item.url, source: 'manual' },
    })

    return c.json(item, 201)
  } catch (error) {
    if (error instanceof CreateItemError) {
      recordAppLog({
        action: 'item.add.failed',
        outcome: 'failure',
        summary: url
          ? `Failed to add link ${url}: ${error.message}`
          : `Failed to add link: ${error.message}`,
        details: { url, code: error.code, source: 'manual' },
      })

      return c.json({ error: error.message }, error.status)
    }

    throw error
  }
})

itemsRoutes.delete('/:id', (c) => {
  const id = Number.parseInt(c.req.param('id'), 10)

  if (Number.isNaN(id)) {
    recordAppLog({
      action: 'item.delete.failed',
      outcome: 'failure',
      summary: 'Failed to delete link: invalid item id.',
      details: { id: c.req.param('id') },
    })

    return c.json({ error: 'Invalid item id.' }, 400)
  }

  const existing = getItemById(id)
  const deleted = deleteItems([id])

  if (deleted === 0) {
    logItemDeleteFailed(id, 'item not found.')

    return c.json({ error: 'Item not found.' }, 404)
  }

  logItemDeleted(existing, id)

  return c.json({ ok: true, deleted })
})

itemsRoutes.post('/bulk-delete', async (c) => {
  const body = await c.req.json<{ ids?: number[] }>()
  const ids = Array.isArray(body.ids) ? body.ids.filter((id) => Number.isInteger(id)) : []

  if (ids.length === 0) {
    recordAppLog({
      action: 'items.bulk_delete.failed',
      outcome: 'failure',
      summary: 'Bulk delete did not run: no item ids provided.',
    })

    return c.json({
      ok: true,
      deleted: 0,
    })
  }

  const itemsBeforeDelete = new Map(
    ids.map((id) => [id, getItemById(id)] as const)
  )

  const deleted = deleteItems(ids)

  for (const id of ids) {
    const existing = itemsBeforeDelete.get(id) ?? null

    if (!existing) {
      logItemDeleteFailed(id, 'item not found.')
      continue
    }

    logItemDeleted(existing, id)
  }

  return c.json({
    ok: true,
    deleted,
  })
})

itemsRoutes.post('/clear-archived', (c) => {
  const archivedItems = getAllItems().filter((item) => item.status === 'archive')
  const deleted = deleteByStatus('archive')

  for (const item of archivedItems) {
    logItemDeleted(item, item.id)
  }

  return c.json({
    ok: true,
    deleted,
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
  const existing = getItemById(id)

  if (!existing) {
    if (body.status !== undefined) {
      recordAppLog({
        action: 'item.archive.failed',
        outcome: 'failure',
        summary: 'Failed to update link status: item not found.',
        details: { id, status: body.status },
      })
    }

    return c.json({ error: 'Item not found.' }, 404)
  }

  const updated = updateItem(id, body)

  if (!updated) {
    return c.json({ error: 'Item not found.' }, 404)
  }

  if (body.status !== undefined && body.status !== existing.status) {
    if (body.status === 'archive') {
      recordAppLog({
        action: 'item.archived',
        outcome: 'success',
        summary: `Archived link: ${updated.url}`,
        details: { id: updated.id, url: updated.url },
      })
    } else {
      recordAppLog({
        action: 'item.unarchived',
        outcome: 'success',
        summary: `Moved link back to unread: ${updated.url}`,
        details: { id: updated.id, url: updated.url },
      })
    }
  }

  return c.json(updated)
})
