import { Hono } from 'hono'
import {
  addDomainRuleToShelf,
  addItemsToShelf,
  createShelf,
  deleteDomainRuleFromShelf,
  deleteShelf,
  getAllShelves,
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

  if (!getShelfById(id)) {
    return c.json({ error: 'Shelf not found.' }, 404)
  }

  const body = await c.req.json<{ itemIds?: number[] }>()
  const itemIds = Array.isArray(body.itemIds) ? body.itemIds.filter((itemId) => Number.isInteger(itemId)) : []

  if (itemIds.length === 0) {
    return c.json({ error: 'At least one item id is required.' }, 400)
  }

  return c.json({
    ok: true,
    added: addItemsToShelf(id, itemIds),
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

  if (!getShelfById(id)) {
    return c.json({ error: 'Shelf not found.' }, 404)
  }

  const body = await c.req.json<{ domain?: string }>()
  const domain = body.domain?.trim() ?? ''

  if (!domain) {
    return c.json({ error: 'Domain is required.' }, 400)
  }

  try {
    const result = addDomainRuleToShelf(id, domain)

    return c.json({
      ok: true,
      domain: result.domain,
      added: result.linkedItems,
    })
  } catch (error) {
    if (error instanceof Error) {
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
