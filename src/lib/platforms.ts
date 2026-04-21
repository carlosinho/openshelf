export type SupportedPlatform = 'twitter' | 'reddit' | 'github'

export const PLATFORM_OPTIONS: Array<{
  key: SupportedPlatform
  label: string
}> = [
  { key: 'twitter', label: 'Twitter' },
  { key: 'reddit', label: 'Reddit' },
  { key: 'github', label: 'GitHub' },
]

const PLATFORM_HOSTS: Record<SupportedPlatform, string[]> = {
  twitter: ['twitter.com', 'x.com'],
  reddit: ['reddit.com'],
  github: ['github.com'],
}

function matchesHost(hostname: string, expectedHost: string) {
  return hostname === expectedHost || hostname.endsWith(`.${expectedHost}`)
}

export function detectPlatformFromUrl(url: string): SupportedPlatform | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '')

    for (const [platform, hosts] of Object.entries(PLATFORM_HOSTS) as Array<
      [SupportedPlatform, string[]]
    >) {
      if (hosts.some((host) => matchesHost(hostname, host))) {
        return platform
      }
    }

    return null
  } catch {
    return null
  }
}
