const allowedParamPrefixes = [
  'utm_',
  'ref',
  'fbclid',
  'gclid',
  'msclkid',
  'twclid',
  'igshid',
  'source',
  'from',
  'campaign',
  'medium',
]

export function isHomepage(url: string) {
  try {
    const urlObj = new URL(url)
    const isRootPath = urlObj.pathname === '/' || urlObj.pathname === ''
    const hasNoHash = urlObj.hash === ''

    if (!isRootPath || !hasNoHash) {
      return false
    }

    const searchParams = new URLSearchParams(urlObj.search)

    for (const [paramName] of searchParams) {
      const normalizedParamName = paramName.toLowerCase()
      const isAllowed = allowedParamPrefixes.some((prefix) => {
        const normalizedPrefix = prefix.toLowerCase()
        return (
          normalizedParamName.startsWith(normalizedPrefix) ||
          normalizedParamName === normalizedPrefix
        )
      })

      if (!isAllowed) {
        return false
      }
    }

    return true
  } catch {
    return false
  }
}
