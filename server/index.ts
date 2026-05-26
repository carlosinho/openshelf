import { join } from 'path'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { authRoutes, initializeAuth, requireAuth } from './auth'
import { getItemCount } from './db'
import { apiKeyRoutes } from './routes/api-key'
import { importRoutes } from './routes/import'
import { itemsRoutes } from './routes/items'
import { logsRoutes } from './routes/logs'
import { shelvesRoutes } from './routes/shelves'
import { v1Routes } from './routes/v1'

await initializeAuth()

const app = new Hono()
const isDevelopment = process.env.NODE_ENV === 'development'

function isApiPath(path: string) {
  return path === '/api' || path.startsWith('/api/')
}

app.onError((error, c) => {
  const path = c.req.path

  if (!isApiPath(path)) {
    console.error(`[OpenShelf] Unhandled error: ${c.req.method} ${path}`, error)
    return c.text('Internal Server Error', 500)
  }

  if (error instanceof SyntaxError) {
    return c.json({ error: 'Invalid request body.' }, 400)
  }

  if (error instanceof HTTPException) {
    const status = error.status

    if (status >= 500) {
      console.error(`[OpenShelf] API error: ${c.req.method} ${path}`, error)
    }

    return c.json({ error: error.message || 'Request failed.' }, status)
  }

  console.error(`[OpenShelf] API error: ${c.req.method} ${path}`, error)
  return c.json({ error: 'Internal server error.' }, 500)
})

app.get('/api/health', (c) => {
  return c.json({
    ok: true,
    items: getItemCount(),
  })
})

app.route('/api/auth', authRoutes)
app.route('/api/v1', v1Routes)
app.use('/api/*', requireAuth)
app.route('/api/api-key', apiKeyRoutes)
app.route('/api/items', itemsRoutes)
app.route('/api/logs', logsRoutes)
app.route('/api/shelves', shelvesRoutes)
app.route('/api', importRoutes)

app.get('*', async (c) => {
  if (isDevelopment) {
    return c.json({
      ok: true,
      message: 'OpenShelf API server is running in development mode. Open http://localhost:5173 for the frontend.',
    })
  }

  const requestedPath = c.req.path === '/' ? 'index.html' : c.req.path.replace(/^\/+/, '')
  const requestedFile = Bun.file(join(process.cwd(), 'dist', requestedPath))

  if (await requestedFile.exists()) {
    return new Response(requestedFile)
  }

  const indexFile = Bun.file(join(process.cwd(), 'dist', 'index.html'))
  return new Response(indexFile, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
})

const port = Number(process.env.PORT ?? 3000)

console.log(
  isDevelopment
    ? `OpenShelf API server running on http://localhost:${port} (frontend dev server: http://localhost:5173)`
    : `OpenShelf server running on http://localhost:${port}`
)

Bun.serve({
  port,
  fetch: app.fetch,
})
