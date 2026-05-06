import { parse } from 'tldts'

function normalizeHostname(hostname: string) {
  return hostname.trim().toLowerCase().replace(/\.+$/, '').replace(/^www\./, '')
}

export function getRootDomainFromHostname(hostname: string): string | null {
  const normalized = normalizeHostname(hostname)

  if (!normalized) {
    return null
  }

  const parsed = parse(normalized)
  return parsed.domain ?? normalized
}

export function getRootDomainFromUrl(url: string): string | null {
  try {
    return getRootDomainFromHostname(new URL(url).hostname)
  } catch {
    return null
  }
}
