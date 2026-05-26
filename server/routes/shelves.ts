import { Hono } from 'hono'
import { recordAppLog } from '../app-log'
import {
  addDomainRuleToShelf,
  addItemsToShelf,
  createShelf,
  deleteDomainRuleFromShelf,
  deleteShelf,
  getAllShelves,
  getItemById,
  getShelfById,
  removeItemFromShelf,
  renameShelf,
} from '../db'

function isUniqueConstraintError(error: unknown) {
  return error instanceof Error && error.message.toLowerCase().includes('unique')
}

function parseId(value: string) {
  const id = Number.parseInt(value, 10)
  return Number.isNaN(id) ? null : id
}

export const shelvesRoutes = new Hono()

shelvesRoutes.get('/', (c) => {
  return c.json(getAllShelves())
})

shelvesRoutes.post('/', async (c) => {
  const body = await c.req.json<{ name?: string }>()
  const name = body.name?.trim() ?? ''

  if (!name) {
    return c.json({ error: 'Shelf name is required.' }, 400)
  }

  try {
    return c.json(createShelf(name), 201)
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return c.json({ error: 'A shelf with that name already exists.' }, 409)
    }

    throw error
  }
})

shelvesRoutes.patch('/:id', async (c) => {
  const id = parseId(c.req.param('id'))
  if (id === null) {
    return c.json({ error: 'Invalid shelf id.' }, 400)
  }

  const body = await c.req.json<{ name?: string }>()
  const name = body.name?.trim() ?? ''

  if (!name) {
    return c.json({ error: 'Shelf name is required.' }, 400)
  }

  try {
    const updated = renameShelf(id, name)

    if (!updated) {
      return c.json({ error: 'Shelf not found.' }, 404)
    }

    return c.json(updated)
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return c.json({ error: 'A shelf with that name already exists.' }, 409)
    }

    throw error
  }
})

shelvesRoutes.delete('/:id', (c) => {
  const id = parseId(c.req.param('id'))
  if (id === null) {
    return c.json({ error: 'Invalid shelf id.' }, 400)
  }

  const deleted = deleteShelf(id)

  if (deleted === 0) {
    return c.json({ error: 'Shelf not found.' }, 404)
  }

  return c.json({ ok: true, deleted })
})

shelvesRoutes.post('/:id/items', async (c) => {
  const id = parseId(c.req.param('id'))
  if (id === null) {
    return c.json({ error: 'Invalid shelf id.' }, 400)
  }

  const shelf = getShelfById(id)

  if (!shelf) {
    recordAppLog({
      action: 'shelf.item_add.failed',
      outcome: 'failure',
      summary: 'Failed to add link to shelf: shelf not found.',
      details: { shelf_id: id },
    })

    return c.json({ error: 'Shelf not found.' }, 404)
  }

  const body = await c.req.json<{ itemIds?: number[] }>()
  const itemIds = Array.isArray(body.itemIds) ? body.itemIds.filter((itemId) => Number.isInteger(itemId)) : []

  if (itemIds.length === 0) {
    recordAppLog({
      action: 'shelf.item_add.failed',
      outcome: 'failure',
      summary: 'Failed to add link to shelf: no item ids provided.',
      details: { shelf_id: id },
    })

    return c.json({ error: 'At least one item id is required.' }, 400)
  }

  const { added, addedItemIds } = addItemsToShelf(id, itemIds)
  const addedIdSet = new Set(addedItemIds)

  for (const itemId of itemIds) {
    const item = getItemById(itemId)

    if (addedIdSet.has(itemId) && item) {
      recordAppLog({
        action: 'shelf.item_added',
        outcome: 'success',
        summary: `Added ${item.url} to shelf "${shelf.name}".`,
        details: {
          shelf_id: id,
          shelf_name: shelf.name,
          item_id: itemId,
          url: item.url,
        },
      })
      continue
    }

    recordAppLog({
      action: 'shelf.item_add.failed',
      outcome: 'failure',
      summary: item
        ? `Could not add ${item.url} to shelf "${shelf.name}" (already on shelf).`
        : `Could not add link #${itemId} to shelf "${shelf.name}" (link not found).`,
      details: {
        shelf_id: id,
        shelf_name: shelf.name,
        item_id: itemId,
        url: item?.url,
        reason: item ? 'already_on_shelf' : 'item_not_found',
      },
    })
  }

  return c.json({
    ok: true,
    added,
  })
})

shelvesRoutes.delete('/:id/items/:itemId', (c) => {
  const id = parseId(c.req.param('id'))
  const itemId = parseId(c.req.param('itemId'))

  if (id === null || itemId === null) {
    return c.json({ error: 'Invalid shelf or item id.' }, 400)
  }

  if (!getShelfById(id)) {
    return c.json({ error: 'Shelf not found.' }, 404)
  }

  return c.json({
    ok: true,
    deleted: removeItemFromShelf(id, itemId),
  })
})

shelvesRoutes.post('/:id/domains', async (c) => {
  const id = parseId(c.req.param('id'))
  if (id === null) {
    return c.json({ error: 'Invalid shelf id.' }, 400)
  }

  const shelf = getShelfById(id)

  if (!shelf) {
    recordAppLog({
      action: 'shelf.domain_add.failed',
      outcome: 'failure',
      summary: 'Failed to add domain to shelf: shelf not found.',
      details: { shelf_id: id },
    })

    return c.json({ error: 'Shelf not found.' }, 404)
  }

  const body = await c.req.json<{ domain?: string }>()
  const domain = body.domain?.trim() ?? ''

  if (!domain) {
    recordAppLog({
      action: 'shelf.domain_add.failed',
      outcome: 'failure',
      summary: 'Failed to add domain to shelf: domain is required.',
      details: { shelf_id: id, shelf_name: shelf.name },
    })

    return c.json({ error: 'Domain is required.' }, 400)
  }

  try {
    const result = addDomainRuleToShelf(id, domain)

    recordAppLog({
      action: 'shelf.domain_added',
      outcome: 'success',
      summary: `Added domain "${result.domain}" to shelf "${shelf.name}".`,
      details: {
        shelf_id: id,
        shelf_name: shelf.name,
        domain: result.domain,
        linked_items: result.linkedItems,
      },
    })

    for (const itemId of result.linkedItemIds) {
      const item = getItemById(itemId)

      if (!item) {
        continue
      }

      recordAppLog({
        action: 'shelf.item_added',
        outcome: 'success',
        summary: `Added ${item.url} to shelf "${shelf.name}" (domain ${result.domain}).`,
        details: {
          shelf_id: id,
          shelf_name: shelf.name,
          item_id: itemId,
          url: item.url,
          domain: result.domain,
        },
      })
    }

    return c.json({
      ok: true,
      domain: result.domain,
      added: result.linkedItems,
    })
  } catch (error) {
    if (error instanceof Error) {
      recordAppLog({
        action: 'shelf.domain_add.failed',
        outcome: 'failure',
        summary: `Failed to add domain to shelf: ${error.message}`,
        details: { shelf_id: id, shelf_name: shelf?.name, domain },
      })

      return c.json({ error: error.message }, 400)
    }

    throw error
  }
})

shelvesRoutes.delete('/:id/domains/:domain', (c) => {
  const id = parseId(c.req.param('id'))
  const domain = c.req.param('domain')

  if (id === null) {
    return c.json({ error: 'Invalid shelf id.' }, 400)
  }

  if (!getShelfById(id)) {
    return c.json({ error: 'Shelf not found.' }, 404)
  }

  try {
    return c.json({
      ok: true,
      deleted: deleteDomainRuleFromShelf(id, domain),
    })
  } catch (error) {
    if (error instanceof Error) {
      return c.json({ error: error.message }, 400)
    }

    throw error
  }
})
