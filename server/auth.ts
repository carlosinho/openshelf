import { createMiddleware } from 'hono/factory'
import { deleteCookie, getSignedCookie, setSignedCookie } from 'hono/cookie'
import { Hono } from 'hono'

const SESSION_COOKIE_NAME = 'openshelf_session'

let passwordHashPromise: Promise<string> | null = null
const sessionSecretValue = `${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`

function getPassword() {
  const password = process.env.OPENSHELF_PASSWORD?.trim()

  if (!password) {
    throw new Error('OPENSHELF_PASSWORD must be set before starting OpenShelf.')
  }

  return password
}

function getSessionSecret() {
  return sessionSecretValue
}

async function getPasswordHash() {
  if (!passwordHashPromise) {
    passwordHashPromise = Bun.password.hash(getPassword())
  }

  return passwordHashPromise
}

async function getSession(c: Parameters<typeof getSignedCookie>[0]) {
  return getSignedCookie(c, getSessionSecret(), SESSION_COOKIE_NAME)
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'Lax' as const,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30,
  }
}

export async function initializeAuth() {
  await getPasswordHash()
  getSessionSecret()
}

export const requireAuth = createMiddleware(async (c, next) => {
  if (c.req.path === '/api/auth/login' || c.req.path === '/api/health') {
    await next()
    return
  }

  const session = await getSession(c)

  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  await next()
})

export const authRoutes = new Hono()

authRoutes.post('/login', async (c) => {
  const body = await c.req.json<{ password?: string }>()
  const password = body.password?.trim() ?? ''

  if (!password) {
    return c.json({ error: 'Password is required.' }, 400)
  }

  const isValid = await Bun.password.verify(password, await getPasswordHash())

  if (!isValid) {
    return c.json({ error: 'Invalid password.' }, 401)
  }

  await setSignedCookie(c, SESSION_COOKIE_NAME, 'authenticated', getSessionSecret(), cookieOptions())

  return c.json({ ok: true })
})

authRoutes.post('/logout', async (c) => {
  const session = await getSession(c)

  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  deleteCookie(c, SESSION_COOKIE_NAME, { path: '/' })
  return c.json({ ok: true })
})

authRoutes.get('/check', async (c) => {
  const session = await getSession(c)

  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  return c.json({ ok: true })
})
