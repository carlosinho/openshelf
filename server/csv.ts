import Papa from 'papaparse'
import type { ImportItemInput } from './db'
import { normalizeUrl } from './url'

export type ImportSource = 'pocket' | 'instapaper' | 'matter'

export interface ParsedCsvResult {
  data: ImportItemInput[]
  errors: string[]
  fileName: string
}

export const REQUIRED_HEADERS = ['title', 'url', 'time_added', 'tags', 'status']
const INSTAPAPER_REQUIRED_HEADERS = ['url', 'title', 'folder', 'timestamp', 'tags']
const MATTER_REQUIRED_HEADERS = [
  'title',
  'author',
  'publisher',
  'url',
  'tags',
  'word count',
  'in queue',
  'favorited',
  'read',
  'highlight count',
  'last interaction date',
  'file id',
]
export const VALID_STATUSES = ['archive', 'unread'] as const

function validateCSVFormat(headers: string[], requiredHeaders: string[]): string[] {
  const errors: string[] = []

  const missingHeaders = requiredHeaders.filter((header) =>
    !headers.some((candidate) => candidate.toLowerCase().trim() === header)
  )

  if (missingHeaders.length > 0) {
    errors.push(`Missing required columns: ${missingHeaders.join(', ')}`)
  }

  return errors
}

export function validatePocketCSVFormat(headers: string[]): string[] {
  return validateCSVFormat(headers, REQUIRED_HEADERS)
}

export function validateInstapaperCSVFormat(headers: string[]): string[] {
  return validateCSVFormat(headers, INSTAPAPER_REQUIRED_HEADERS)
}

export function validateMatterCSVFormat(headers: string[]): string[] {
  return validateCSVFormat(headers, MATTER_REQUIRED_HEADERS)
}

export function validatePocketItem(
  row: Record<string, string>,
  rowIndex: number
): { item?: ImportItemInput; errors: string[] } {
  const errors: string[] = []

  if (!row.title || row.title.trim() === '') {
    errors.push(`Row ${rowIndex + 1}: Title is required`)
  }

  let normalizedUrl = ''

  if (!row.url || row.url.trim() === '') {
    errors.push(`Row ${rowIndex + 1}: URL is required`)
  } else {
    try {
      normalizedUrl = normalizeUrl(row.url.trim())
    } catch {
      errors.push(`Row ${rowIndex + 1}: Invalid URL format`)
    }
  }

  if (!row.time_added) {
    errors.push(`Row ${rowIndex + 1}: time_added is required`)
  } else {
    const timestamp = Number.parseInt(row.time_added, 10)
    if (Number.isNaN(timestamp) || timestamp <= 0) {
      errors.push(`Row ${rowIndex + 1}: Invalid timestamp`)
    }
  }

  if (!row.status || !VALID_STATUSES.includes(row.status.toLowerCase().trim() as typeof VALID_STATUSES[number])) {
    errors.push(`Row ${rowIndex + 1}: Status must be 'archive' or 'unread'`)
  }

  if (errors.length > 0) {
    return { errors }
  }

  return {
    item: {
      title: row.title.trim(),
      url: normalizedUrl,
      time_added: Number.parseInt(row.time_added, 10),
      tags: row.tags ? row.tags.trim() : '',
      status: row.status.toLowerCase().trim() as ImportItemInput['status'],
    },
    errors: [],
  }
}

function normalizeInstapaperTags(rawTags: string | undefined) {
  const tags = rawTags?.trim() ?? ''

  if (!tags || tags === '[]') {
    return ''
  }

  try {
    const parsed = JSON.parse(tags)

    if (Array.isArray(parsed)) {
      return parsed
        .filter((tag): tag is string => typeof tag === 'string')
        .map((tag) => tag.trim())
        .filter(Boolean)
        .join(', ')
    }
  } catch {
    // Fall through to preserving the source value when it is not JSON.
  }

  return tags
}

function normalizeInstapaperStatus(folder: string | undefined): ImportItemInput['status'] | null {
  const normalizedFolder = folder?.trim().toLowerCase()

  if (normalizedFolder === 'unread') {
    return 'unread'
  }

  if (normalizedFolder === 'archive' || normalizedFolder === 'archived') {
    return 'archive'
  }

  return null
}

export function validateInstapaperItem(
  row: Record<string, string>,
  rowIndex: number
): { item?: ImportItemInput; errors: string[] } {
  const errors: string[] = []

  if (!row.title || row.title.trim() === '') {
    errors.push(`Row ${rowIndex + 1}: Title is required`)
  }

  let normalizedUrl = ''

  if (!row.url || row.url.trim() === '') {
    errors.push(`Row ${rowIndex + 1}: URL is required`)
  } else {
    try {
      normalizedUrl = normalizeUrl(row.url.trim())
    } catch {
      errors.push(`Row ${rowIndex + 1}: Invalid URL format`)
    }
  }

  if (!row.timestamp) {
    errors.push(`Row ${rowIndex + 1}: Timestamp is required`)
  } else {
    const timestamp = Number.parseInt(row.timestamp, 10)
    if (Number.isNaN(timestamp) || timestamp <= 0) {
      errors.push(`Row ${rowIndex + 1}: Invalid timestamp`)
    }
  }

  const status = normalizeInstapaperStatus(row.folder)
  if (!status) {
    errors.push(`Row ${rowIndex + 1}: Folder must be 'Unread' or 'Archive'`)
  }

  if (errors.length > 0 || !status) {
    return { errors }
  }

  return {
    item: {
      title: row.title.trim(),
      url: normalizedUrl,
      time_added: Number.parseInt(row.timestamp, 10),
      tags: normalizeInstapaperTags(row.tags),
      status,
    },
    errors: [],
  }
}

function parseMatterBoolean(rawValue: string | undefined): boolean | null {
  const normalizedValue = rawValue?.trim().toLowerCase()

  if (normalizedValue === 'true') {
    return true
  }

  if (normalizedValue === 'false') {
    return false
  }

  return null
}

function parseMatterTimestamp(rawValue: string | undefined, fallbackTimestamp: number): number | null {
  const value = rawValue?.trim()

  if (!value) {
    return fallbackTimestamp
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/)

  if (!match) {
    return null
  }

  const [, year, month, day, hour, minute, second] = match
  const timestamp = Math.floor(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second)
    ) / 1000
  )

  return Number.isNaN(timestamp) || timestamp <= 0 ? null : timestamp
}

export function validateMatterItem(
  row: Record<string, string>,
  rowIndex: number,
  fallbackTimestamp: number
): { item?: ImportItemInput; errors: string[] } {
  const errors: string[] = []

  if (!row.title || row.title.trim() === '') {
    errors.push(`Row ${rowIndex + 1}: Title is required`)
  }

  let normalizedUrl = ''

  if (!row.url || row.url.trim() === '') {
    errors.push(`Row ${rowIndex + 1}: URL is required`)
  } else {
    try {
      normalizedUrl = normalizeUrl(row.url.trim())
    } catch {
      errors.push(`Row ${rowIndex + 1}: Invalid URL format`)
    }
  }

  const read = parseMatterBoolean(row.read)
  if (read === null) {
    errors.push(`Row ${rowIndex + 1}: Read must be 'True' or 'False'`)
  }

  const timestamp = parseMatterTimestamp(row['last interaction date'], fallbackTimestamp)
  if (timestamp === null) {
    errors.push(`Row ${rowIndex + 1}: Invalid Last Interaction Date`)
  }

  if (errors.length > 0 || read === null || timestamp === null) {
    return { errors }
  }

  return {
    item: {
      title: row.title.trim(),
      url: normalizedUrl,
      time_added: timestamp,
      tags: row.tags ? row.tags.trim() : '',
      status: read ? 'archive' : 'unread',
    },
    errors: [],
  }
}

export function parsePocketCSVText(csvText: string, fileName: string): ParsedCsvResult {
  const parseResult = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.toLowerCase().trim(),
  })

  const errors: string[] = []
  const data: ImportItemInput[] = []

  if (parseResult.meta.fields) {
    const formatErrors = validatePocketCSVFormat(parseResult.meta.fields)
    errors.push(...formatErrors)

    if (formatErrors.length > 0) {
      return {
        data: [],
        errors,
        fileName,
      }
    }
  }

  parseResult.data.forEach((row, index) => {
    const { item, errors: rowErrors } = validatePocketItem(row, index)

    if (item) {
      data.push(item)
    }

    errors.push(...rowErrors)
  })

  if (parseResult.errors.length > 0) {
    errors.push(
      ...parseResult.errors.map((error) =>
        `Parsing error: ${error.message}${error.row !== undefined ? ` (row ${error.row + 1})` : ''}`
      )
    )
  }

  return {
    data,
    errors,
    fileName,
  }
}

export function parseInstapaperCSVText(csvText: string, fileName: string): ParsedCsvResult {
  const parseResult = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.toLowerCase().trim(),
  })

  const errors: string[] = []
  const data: ImportItemInput[] = []

  if (parseResult.meta.fields) {
    const formatErrors = validateInstapaperCSVFormat(parseResult.meta.fields)
    errors.push(...formatErrors)

    if (formatErrors.length > 0) {
      return {
        data: [],
        errors,
        fileName,
      }
    }
  }

  parseResult.data.forEach((row, index) => {
    const { item, errors: rowErrors } = validateInstapaperItem(row, index)

    if (item) {
      data.push(item)
    }

    errors.push(...rowErrors)
  })

  if (parseResult.errors.length > 0) {
    errors.push(
      ...parseResult.errors.map((error) =>
        `Parsing error: ${error.message}${error.row !== undefined ? ` (row ${error.row + 1})` : ''}`
      )
    )
  }

  return {
    data,
    errors,
    fileName,
  }
}

export function parseMatterCSVText(csvText: string, fileName: string): ParsedCsvResult {
  const parseResult = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.toLowerCase().trim(),
  })

  const errors: string[] = []
  const data: ImportItemInput[] = []

  if (parseResult.meta.fields) {
    const formatErrors = validateMatterCSVFormat(parseResult.meta.fields)
    errors.push(...formatErrors)

    if (formatErrors.length > 0) {
      return {
        data: [],
        errors,
        fileName,
      }
    }
  }

  const fallbackBaseTimestamp = Math.floor(Date.now() / 1000)

  parseResult.data.forEach((row, index) => {
    const { item, errors: rowErrors } = validateMatterItem(row, index, fallbackBaseTimestamp - index)

    if (item) {
      data.push(item)
    }

    errors.push(...rowErrors)
  })

  if (parseResult.errors.length > 0) {
    errors.push(
      ...parseResult.errors.map((error) =>
        `Parsing error: ${error.message}${error.row !== undefined ? ` (row ${error.row + 1})` : ''}`
      )
    )
  }

  return {
    data,
    errors,
    fileName,
  }
}

export function parseImportCSVText(
  csvText: string,
  fileName: string,
  source: ImportSource
): ParsedCsvResult {
  if (source === 'instapaper') {
    return parseInstapaperCSVText(csvText, fileName)
  }

  if (source === 'matter') {
    return parseMatterCSVText(csvText, fileName)
  }

  return parsePocketCSVText(csvText, fileName)
}

export function combineCSVResults(results: ParsedCsvResult[]): ParsedCsvResult {
  const combinedData: ImportItemInput[] = []
  const combinedErrors: string[] = []
  const seenUrls = new Set<string>()
  let duplicateCount = 0

  for (const result of results) {
    if (result.errors.length > 0) {
      combinedErrors.push(`Errors in ${result.fileName}:`)
      combinedErrors.push(...result.errors.map((error) => `  ${error}`))
    }

    for (const item of result.data) {
      if (seenUrls.has(item.url)) {
        duplicateCount += 1
        continue
      }

      seenUrls.add(item.url)
      combinedData.push(item)
    }
  }

  if (duplicateCount > 0) {
    combinedErrors.push(`Removed ${duplicateCount} duplicate items`)
  }

  return {
    data: combinedData,
    errors: combinedErrors,
    fileName: results.map((result) => result.fileName).join(', '),
  }
}

export function exportPocketCSV(items: ImportItemInput[]) {
  return Papa.unparse(
    items.map((item) => ({
      title: item.title,
      url: item.url,
      time_added: item.time_added,
      tags: item.tags,
      status: item.status,
    })),
    {
      header: true,
      columns: REQUIRED_HEADERS,
    }
  )
}
