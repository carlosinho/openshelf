import type { PocketItem } from '../types/pocket'

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

export async function importFiles(files: File[]) {
  const formData = new FormData()

  files.forEach((file) => {
    formData.append('files', file, file.name)
  })

  return apiRequest<{ ok: true; imported: number; duplicates: number; errors: string[] }>('/api/import', {
    method: 'POST',
    body: formData,
  })
}
