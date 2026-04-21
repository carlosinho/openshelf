import Papa from 'papaparse'
import type { ImportItemInput } from './db'

export interface ParsedCsvResult {
  data: ImportItemInput[]
  errors: string[]
  fileName: string
}

export const REQUIRED_HEADERS = ['title', 'url', 'time_added', 'tags', 'status']
export const VALID_STATUSES = ['archive', 'unread'] as const

export function validatePocketCSVFormat(headers: string[]): string[] {
  const errors: string[] = []

  const missingHeaders = REQUIRED_HEADERS.filter((header) =>
    !headers.some((candidate) => candidate.toLowerCase().trim() === header)
  )

  if (missingHeaders.length > 0) {
    errors.push(`Missing required columns: ${missingHeaders.join(', ')}`)
  }

  return errors
}

export function validatePocketItem(
  row: Record<string, string>,
  rowIndex: number
): { item?: ImportItemInput; errors: string[] } {
  const errors: string[] = []

  if (!row.title || row.title.trim() === '') {
    errors.push(`Row ${rowIndex + 1}: Title is required`)
  }

  if (!row.url || row.url.trim() === '') {
    errors.push(`Row ${rowIndex + 1}: URL is required`)
  } else {
    try {
      new URL(row.url.trim())
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
      url: row.url.trim(),
      time_added: Number.parseInt(row.time_added, 10),
      tags: row.tags ? row.tags.trim() : '',
      status: row.status.toLowerCase().trim() as ImportItemInput['status'],
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
