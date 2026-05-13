import { checkUrls } from '../lib/api'
import { PocketItem } from '../types/pocket'

export interface ValidationResult {
  status: 'valid' | 'problem'
}

export interface ValidationProgress {
  checked: number
  total: number
  valid: number
  problems: number
}

export interface ValidationState {
  isRunning: boolean
  progress: ValidationProgress
  results: Map<number, ValidationResult>
  canCancel: boolean
}

const URL_CHECK_BATCH_SIZE = 10

export const validateUrls = async (
  items: PocketItem[],
  onProgress: (progress: ValidationProgress) => void,
  signal?: AbortSignal
): Promise<Map<number, ValidationResult>> => {
  const results = new Map<number, ValidationResult>()

  let checked = 0
  let valid = 0
  let problems = 0

  for (let i = 0; i < items.length; i += URL_CHECK_BATCH_SIZE) {
    if (signal?.aborted) {
      throw new Error('Validation cancelled')
    }

    const batch = items.slice(i, i + URL_CHECK_BATCH_SIZE)
    const batchResponse = await checkUrls(
      batch.map((item) => item.id),
      signal
    )

    for (const result of batchResponse.results) {
      results.set(result.id, { status: result.status })

      if (result.status === 'valid') {
        valid += 1
      } else {
        problems += 1
      }
    }

    checked += batchResponse.checked

    onProgress({
      checked,
      total: items.length,
      valid,
      problems
    })
  }

  return results
}