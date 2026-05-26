import type { InsertAppLogInput } from '../src/types/app-log'
import { insertAppLog, isAppLoggingEnabled } from './db'

export function recordAppLog(input: InsertAppLogInput) {
  if (!isAppLoggingEnabled()) {
    return
  }

  try {
    insertAppLog(input)
  } catch (error) {
    console.error('[OpenShelf] Failed to write app log:', error)
  }
}
