export interface PocketItem {
  id: number
  title: string
  url: string
  time_added: number
  tags: string
  status: 'archive' | 'unread'
  archived_at?: number
  // URL validation fields
  validation_status?: 'pending' | 'checking' | 'valid' | 'problem'
  validation_checked_at?: number
}

export interface FileWithPreview {
  file: File
  id: string
  preview?: string
}

export interface SearchNode {
  id: string
  name: string
  searchType: 'title' | 'url'
  query: string
  results: PocketItem[]
  children?: SearchNode[]
}

export interface AppState {
  items: PocketItem[]
  filteredItems: PocketItem[]
  currentView: 'all' | 'archive' | 'unread'
  searchTree: SearchNode[]
  selectedItems: Set<string>
}

export interface FilterOptions {
  dateRange?: {
    start?: Date
    end?: Date
  }
  addedMoreThanDaysAgo?: number
  tags?: string[]
} 