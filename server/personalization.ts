import { existsSync, readdirSync, unlinkSync, writeFileSync } from 'fs'
import { join, extname } from 'path'

export const DEFAULT_DISPLAY_NAME = 'OpenShelf'
export const META_TITLE_SUFFIX = ' - Self-Hosted Read-Later Manager by OpenShelf'
export const MAX_DISPLAY_NAME_LENGTH = 80
export const MAX_LOGO_BYTES = 2 * 1024 * 1024

const CUSTOM_LOGO_PREFIX = 'custom-logo'

const MIME_TO_EXTENSION: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

const EXTENSION_TO_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
}

export function getDataDirectory() {
  return join(process.cwd(), 'data')
}

export function buildDocumentTitle(displayName: string) {
  return `${displayName}${META_TITLE_SUFFIX}`
}

export function resolveDisplayName(stored: string | null | undefined) {
  const trimmed = stored?.trim() ?? ''

  if (!trimmed) {
    return DEFAULT_DISPLAY_NAME
  }

  return trimmed.slice(0, MAX_DISPLAY_NAME_LENGTH)
}

export function getCustomLogoFilePath() {
  const dataDirectory = getDataDirectory()

  if (!existsSync(dataDirectory)) {
    return null
  }

  const match = readdirSync(dataDirectory).find((fileName) =>
    fileName.startsWith(`${CUSTOM_LOGO_PREFIX}.`)
  )

  if (!match) {
    return null
  }

  return join(dataDirectory, match)
}

export function hasCustomLogo() {
  return getCustomLogoFilePath() !== null
}

export function getCustomLogoMimeType(filePath: string) {
  const extension = extname(filePath).replace(/^\./, '').toLowerCase()
  return EXTENSION_TO_MIME[extension] ?? 'application/octet-stream'
}

export function deleteCustomLogoFiles() {
  const dataDirectory = getDataDirectory()

  if (!existsSync(dataDirectory)) {
    return
  }

  for (const fileName of readdirSync(dataDirectory)) {
    if (fileName.startsWith(`${CUSTOM_LOGO_PREFIX}.`)) {
      unlinkSync(join(dataDirectory, fileName))
    }
  }
}

export function extensionForMimeType(mimeType: string) {
  return MIME_TO_EXTENSION[mimeType] ?? null
}

export function isAllowedLogoMimeType(mimeType: string) {
  return mimeType in MIME_TO_EXTENSION
}

export async function saveCustomLogo(file: File) {
  const mimeType = file.type.trim().toLowerCase()

  if (!isAllowedLogoMimeType(mimeType)) {
    throw new Error('Logo must be a PNG, JPEG, WebP, or GIF image.')
  }

  if (file.size > MAX_LOGO_BYTES) {
    throw new Error('Logo must be 2MB or smaller.')
  }

  const extension = extensionForMimeType(mimeType)

  if (!extension) {
    throw new Error('Logo must be a PNG, JPEG, WebP, or GIF image.')
  }

  const bytes = new Uint8Array(await file.arrayBuffer())
  deleteCustomLogoFiles()
  writeFileSync(join(getDataDirectory(), `${CUSTOM_LOGO_PREFIX}.${extension}`), bytes)
}
