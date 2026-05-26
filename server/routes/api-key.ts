import { Hono } from 'hono'
import { generateApiKeyToken } from '../api-key'
import { recordAppLog } from '../app-log'
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
  const hadKey = Boolean(getApiKeyRecord())
  const apiKey = generateApiKeyToken()
  const record = setApiKey(apiKey)

  recordAppLog({
    action: 'api_key.generated',
    outcome: 'success',
    summary: hadKey ? 'Regenerated the API key.' : 'Generated a new API key.',
    details: { regenerated: hadKey },
  })

  return c.json({
    configured: true,
    api_key: record.api_key,
    created_at: record.created_at,
  })
})

apiKeyRoutes.delete('/', (c) => {
  const hadKey = Boolean(getApiKeyRecord())
  const revoked = clearApiKey()

  recordAppLog({
    action: 'api_key.revoked',
    outcome: revoked ? 'success' : 'failure',
    summary: revoked
      ? 'Revoked the API key.'
      : hadKey
        ? 'Failed to revoke the API key.'
        : 'Revoke API key: no key was configured.',
    details: { had_key: hadKey },
  })

  return c.json({ configured: false })
})
