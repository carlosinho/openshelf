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
  results: Map<string, ValidationResult>
  canCancel: boolean
}

// Simple iframe-based URL validation - just valid or problem
export const validateSingleUrl = async (url: string, signal?: AbortSignal): Promise<ValidationResult> => {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Validation cancelled'))
      return
    }

    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    iframe.style.position = 'absolute'
    iframe.style.left = '-9999px'
    iframe.style.width = '1px'
    iframe.style.height = '1px'
    
    let timeoutId: NodeJS.Timeout
    let resolved = false

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId)
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
    }

    // Success = valid
    iframe.onload = () => {
      if (resolved) return
      resolved = true
      cleanup()
      resolve({ status: 'valid' })
    }

    // Error = problem
    iframe.onerror = () => {
      if (resolved) return
      resolved = true
      cleanup()
      resolve({ status: 'problem' })
    }

    // Timeout = problem
    timeoutId = setTimeout(() => {
      if (resolved) return
      resolved = true
      cleanup()
      resolve({ status: 'problem' })
    }, 8000)

    // Cancellation
    if (signal) {
      signal.addEventListener('abort', () => {
        if (resolved) return
        resolved = true
        cleanup()
        reject(new Error('Validation cancelled'))
      })
    }

    try {
      iframe.src = url
      document.body.appendChild(iframe)
    } catch (error) {
      if (resolved) return
      resolved = true
      cleanup()
      resolve({ status: 'problem' })
    }
  })
}

// Batch validate URLs with progress tracking
export const validateUrls = async (
  items: PocketItem[],
  onProgress: (progress: ValidationProgress) => void,
  signal?: AbortSignal
): Promise<Map<string, ValidationResult>> => {
  const results = new Map<string, ValidationResult>()
  const batchSize = 10
  const delayBetweenBatches = 100

  let checked = 0
  let valid = 0
  let problems = 0

  for (let i = 0; i < items.length; i += batchSize) {
    if (signal?.aborted) {
      throw new Error('Validation cancelled')
    }

    const batch = items.slice(i, i + batchSize)
    
    const batchPromises = batch.map(async (item) => {
      try {
        const result = await validateSingleUrl(item.url, signal)
        results.set(item.url, result)

        if (result.status === 'valid') {
          valid++
        } else {
          problems++
        }

        return result
      } catch (error) {
        if (signal?.aborted) throw error
        
        const errorResult: ValidationResult = { status: 'problem' }
        results.set(item.url, errorResult)
        problems++
        return errorResult
      }
    })

    await Promise.allSettled(batchPromises)
    checked += batch.length

    onProgress({
      checked,
      total: items.length,
      valid,
      problems
    })

    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches))
    }
  }

  return results
} 