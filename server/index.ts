import { join } from 'path'
import { Hono } from 'hono'
import { authRoutes, initializeAuth, requireAuth } from './auth'
import { getItemCount } from './db'
import { importRoutes } from './routes/import'
import { itemsRoutes } from './routes/items'

await initializeAuth()

const app = new Hono()
const isDevelopment = process.env.NODE_ENV === 'development'

app.get('/api/health', (c) => {
  return c.json({
    ok: true,
    items: getItemCount(),
  })
})

app.route('/api/auth', authRoutes)
app.use('/api/*', requireAuth)
app.route('/api/items', itemsRoutes)
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
