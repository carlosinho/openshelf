import type { PersonalizationSettings } from '../types/settings'

export const DEFAULT_DISPLAY_NAME = 'OpenShelf'
export const DEFAULT_HEADER_LOGO = '/nookio-side.png'
export const DEFAULT_FAVICON = '/nookio-front-ico.png'
export const META_TITLE_SUFFIX = ' - Self-Hosted Read-Later Manager by OpenShelf'

export function isDefaultDisplayName(displayName: string) {
  return displayName.trim() === DEFAULT_DISPLAY_NAME
}

export function buildDocumentTitle(displayName: string) {
  return `${displayName}${META_TITLE_SUFFIX}`
}

export function getLogoSrc(settings: PersonalizationSettings) {
  if (!settings.has_custom_logo) {
    return DEFAULT_HEADER_LOGO
  }

  const version = settings.logo_updated_at ?? '1'
  return `/api/settings/logo?v=${version}`
}

export function getFaviconHref(settings: PersonalizationSettings) {
  if (!settings.has_custom_logo) {
    return DEFAULT_FAVICON
  }

  const version = settings.logo_updated_at ?? '1'
  return `/api/settings/logo?v=${version}`
}

export function applyBrandingToDocument(settings: PersonalizationSettings) {
  document.title = buildDocumentTitle(settings.display_name)

  let faviconLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]')

  if (!faviconLink) {
    faviconLink = document.createElement('link')
    faviconLink.rel = 'icon'
    document.head.appendChild(faviconLink)
  }

  const href = getFaviconHref(settings)
  faviconLink.type = settings.has_custom_logo ? 'image/png' : 'image/png'
  faviconLink.href = href
}
