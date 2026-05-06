export function normalizeUrl(rawUrl: string) {
  const candidate = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`
  return new URL(candidate).toString()
}
