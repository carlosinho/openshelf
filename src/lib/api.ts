import type { AppLogsResponse } from '../types/app-log'
import type { PocketItem, Shelf } from '../types/pocket'
import type { ImportSource } from '../types/import'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function parseResponse(response: Response) {
  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    return response.json()
  }

  return response.text()
}

async function apiRequest<T>(path: string, init: RequestInit = {}) {
  const isFormData = init.body instanceof FormData
  const headers = new Headers(init.headers)

  if (!isFormData && init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(path, {
    ...init,
    credentials: 'include',
    headers,
  })

  const payload = await parseResponse(response)

  if (!response.ok) {
    const message =
      typeof payload === 'object' && payload !== null && 'error' in payload
        ? String(payload.error)
        : `Request failed with status ${response.status}`

    throw new ApiError(message, response.status)
  }

  return payload as T
}

export async function checkAuth() {
  return apiRequest<{ ok: true }>('/api/auth/check')
}

export async function login(password: string) {
  return apiRequest<{ ok: true }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
}

export async function logout() {
  return apiRequest<{ ok: true }>('/api/auth/logout', {
    method: 'POST',
  })
}

export async function fetchItems() {
  return apiRequest<PocketItem[]>('/api/items')
}

export async function fetchShelves() {
  return apiRequest<Shelf[]>('/api/shelves')
}

export async function createItem(input: { url: string; title?: string; tags?: string }) {
  return apiRequest<PocketItem>('/api/items', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function deleteItem(id: number) {
  return apiRequest<{ ok: true; deleted: number }>(`/api/items/${id}`, {
    method: 'DELETE',
  })
}

export async function bulkDeleteItems(ids: number[]) {
  return apiRequest<{ ok: true; deleted: number }>('/api/items/bulk-delete', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  })
}

export async function clearArchivedItems() {
  return apiRequest<{ ok: true; deleted: number }>('/api/items/clear-archived', {
    method: 'POST',
  })
}

export async function patchItem(
  id: number,
  fields: Partial<Pick<PocketItem, 'status' | 'validation_status' | 'validation_checked_at' | 'title' | 'tags'>>
) {
  return apiRequest<PocketItem>(`/api/items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(fields),
  })
}

export interface UrlCheckBatchResult {
  id: number
  status: 'valid' | 'problem'
}

export interface UrlCheckBatchResponse {
  ok: true
  checked: number
  checked_at: number
  results: UrlCheckBatchResult[]
}

export async function checkUrls(ids: number[], signal?: AbortSignal) {
  return apiRequest<UrlCheckBatchResponse>('/api/items/check-urls', {
    method: 'POST',
    body: JSON.stringify({ ids }),
    signal,
  })
}

export async function importFiles(files: File[], source: ImportSource = 'pocket') {
  const formData = new FormData()

  formData.append('source', source)

  files.forEach((file) => {
    formData.append('files', file, file.name)
  })

  return apiRequest<{ ok: true; imported: number; duplicates: number; errors: string[] }>('/api/import', {
    method: 'POST',
    body: formData,
  })
}

export async function createShelf(name: string) {
  return apiRequest<Shelf>('/api/shelves', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export async function renameShelf(id: number, name: string) {
  return apiRequest<Shelf>(`/api/shelves/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  })
}

export async function deleteShelf(id: number) {
  return apiRequest<{ ok: true; deleted: number }>(`/api/shelves/${id}`, {
    method: 'DELETE',
  })
}

export async function addItemsToShelf(shelfId: number, itemIds: number[]) {
  return apiRequest<{ ok: true; added: number }>(`/api/shelves/${shelfId}/items`, {
    method: 'POST',
    body: JSON.stringify({ itemIds }),
  })
}

export async function removeItemFromShelf(shelfId: number, itemId: number) {
  return apiRequest<{ ok: true; deleted: number }>(`/api/shelves/${shelfId}/items/${itemId}`, {
    method: 'DELETE',
  })
}

export async function addDomainToShelf(shelfId: number, domain: string) {
  return apiRequest<{ ok: true; domain: string; added: number }>(`/api/shelves/${shelfId}/domains`, {
    method: 'POST',
    body: JSON.stringify({ domain }),
  })
}

export async function removeDomainFromShelf(shelfId: number, domain: string) {
  return apiRequest<{ ok: true; deleted: number }>(
    `/api/shelves/${shelfId}/domains/${encodeURIComponent(domain)}`,
    {
      method: 'DELETE',
    }
  )
}

export type ApiKeyStatus =
  | { configured: false }
  | { configured: true; api_key: string; created_at: number }

export async function fetchApiKeyStatus() {
  return apiRequest<ApiKeyStatus>('/api/api-key')
}

export async function generateApiKey() {
  return apiRequest<Extract<ApiKeyStatus, { configured: true }>>('/api/api-key', {
    method: 'POST',
  })
}

export async function revokeApiKey() {
  return apiRequest<{ configured: false }>('/api/api-key', {
    method: 'DELETE',
  })
}

export async function fetchAppLogs(limit = 200) {
  return apiRequest<AppLogsResponse>(`/api/logs?limit=${limit}`)
}

export async function setAppLoggingEnabled(loggingEnabled: boolean) {
  return apiRequest<{ logging_enabled: boolean }>('/api/logs/settings', {
    method: 'PATCH',
    body: JSON.stringify({ logging_enabled: loggingEnabled }),
  })
}

export async function deleteAllAppLogs() {
  return apiRequest<{ ok: true; deleted: number }>('/api/logs', {
    method: 'DELETE',
  })
}

export async function pruneAppLogs() {
  return apiRequest<{ ok: true; deleted: number; older_than_months: number }>('/api/logs/prune', {
    method: 'POST',
  })
}
