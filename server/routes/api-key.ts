import { Hono } from 'hono'
import { generateApiKeyToken } from '../api-key'
import { clearApiKey, getApiKeyRecord, setApiKey } from '../db'

export const apiKeyRoutes = new Hono()

apiKeyRoutes.get('/', (c) => {
  const record = getApiKeyRecord()

  if (!record) {
    return c.json({ configured: false })
  }

  return c.json({
    configured: true,
    api_key: record.api_key,
    created_at: record.created_at,
  })
})

apiKeyRoutes.post('/', (c) => {
  const apiKey = generateApiKeyToken()
  const record = setApiKey(apiKey)

  return c.json({
    configured: true,
    api_key: record.api_key,
    created_at: record.created_at,
  })
})

apiKeyRoutes.delete('/', (c) => {
  clearApiKey()
  return c.json({ configured: false })
})
