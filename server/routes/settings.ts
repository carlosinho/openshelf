import { Hono } from 'hono'
import {
  clearCustomLogo,
  getPersonalization,
  setDisplayName,
  touchCustomLogo,
} from '../db'
import {
  getCustomLogoFilePath,
  getCustomLogoMimeType,
  hasCustomLogo,
  MAX_DISPLAY_NAME_LENGTH,
  saveCustomLogo,
} from '../personalization'

export const settingsPublicRoutes = new Hono()

settingsPublicRoutes.get('/personalization', (c) => {
  return c.json(getPersonalization())
})

settingsPublicRoutes.get('/logo', async (c) => {
  const filePath = getCustomLogoFilePath()

  if (!filePath) {
    return c.json({ error: 'No custom logo configured.' }, 404)
  }

  const file = Bun.file(filePath)

  if (!(await file.exists())) {
    return c.json({ error: 'No custom logo configured.' }, 404)
  }

  return new Response(file, {
    headers: {
      'Content-Type': getCustomLogoMimeType(filePath),
      'Cache-Control': 'private, max-age=3600',
    },
  })
})

export const settingsAuthRoutes = new Hono()

settingsAuthRoutes.patch('/personalization', async (c) => {
  const body = await c.req.json<{ display_name?: unknown }>()

  if (!('display_name' in body)) {
    return c.json({ error: 'display_name is required.' }, 400)
  }

  if (body.display_name !== null && typeof body.display_name !== 'string') {
    return c.json({ error: 'display_name must be a string or null.' }, 400)
  }

  const rawValue = body.display_name === null ? '' : body.display_name.trim()

  if (rawValue.length > MAX_DISPLAY_NAME_LENGTH) {
    return c.json(
      { error: `display_name must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer.` },
      400
    )
  }

  setDisplayName(rawValue)

  return c.json(getPersonalization())
})

settingsAuthRoutes.post('/logo', async (c) => {
  const formData = await c.req.formData()
  const logo = formData.get('logo')

  if (!(logo instanceof File)) {
    return c.json({ error: 'Please upload a logo file in the "logo" field.' }, 400)
  }

  try {
    await saveCustomLogo(logo)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save logo.'
    return c.json({ error: message }, 400)
  }

  touchCustomLogo()
  return c.json(getPersonalization())
})

settingsAuthRoutes.delete('/logo', (c) => {
  clearCustomLogo()
  return c.json(getPersonalization())
})
