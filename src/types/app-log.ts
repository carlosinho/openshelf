export type AppLogOutcome = 'success' | 'failure'

export type AppLogAction =
  | 'item.added'
  | 'item.add.failed'
  | 'item.archived'
  | 'item.unarchived'
  | 'item.archive.failed'
  | 'item.deleted'
  | 'item.delete.failed'
  | 'items.bulk_deleted'
  | 'items.bulk_delete.failed'
  | 'items.clear_archived'
  | 'item.added.remote'
  | 'item.add.remote.failed'
  | 'shelf.item_added'
  | 'shelf.item_add.failed'
  | 'shelf.domain_added'
  | 'shelf.domain_add.failed'
  | 'import.completed'
  | 'import.failed'
  | 'api_key.generated'
  | 'api_key.revoked'

export interface AppLogEntry {
  id: number
  created_at: number
  action: AppLogAction
  outcome: AppLogOutcome
  summary: string
  details?: string
}

export interface InsertAppLogInput {
  action: AppLogAction
  outcome: AppLogOutcome
  summary: string
  details?: Record<string, unknown>
}

export interface AppLogsResponse {
  logs: AppLogEntry[]
  logging_enabled: boolean
}
