import { useMemo, useState } from 'react'
import { Loader2, Pencil, Trash2, X } from 'lucide-react'
import type { Shelf } from '../../types/pocket'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { ShelfModal } from './ShelfModal'

interface ShelfManagerDialogProps {
  shelves: Shelf[]
  onClose: () => void
  onCreateShelf: (name: string) => Promise<Shelf>
  onRenameShelf: (shelfId: number, name: string) => Promise<void>
  onDeleteShelf: (shelfId: number) => Promise<void>
  onRemoveDomain: (shelfId: number, domain: string) => Promise<void>
}

export function ShelfManagerDialog({
  shelves,
  onClose,
  onCreateShelf,
  onRenameShelf,
  onDeleteShelf,
  onRemoveDomain,
}: ShelfManagerDialogProps) {
  const [newShelfName, setNewShelfName] = useState('')
  const [renameValues, setRenameValues] = useState<Record<number, string>>({})
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const sortedShelves = useMemo(
    () => shelves.slice().sort((left, right) => left.name.localeCompare(right.name)),
    [shelves]
  )

  const handleCreateShelf = async () => {
    const trimmedName = newShelfName.trim()

    if (!trimmedName) {
      setError('Enter a shelf name first.')
      return
    }

    setBusyKey('create')
    setError(null)

    try {
      await onCreateShelf(trimmedName)
      setNewShelfName('')
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create shelf.')
    } finally {
      setBusyKey(null)
    }
  }

  const handleRenameShelf = async (shelf: Shelf) => {
    const nextName = (renameValues[shelf.id] ?? shelf.name).trim()

    if (!nextName) {
      setError('Shelf name cannot be empty.')
      return
    }

    setBusyKey(`rename-${shelf.id}`)
    setError(null)

    try {
      await onRenameShelf(shelf.id, nextName)
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : 'Failed to rename shelf.')
    } finally {
      setBusyKey(null)
    }
  }

  const handleDeleteShelf = async (shelf: Shelf) => {
    if (!confirm(`Delete shelf "${shelf.name}"? Links will stay saved.`)) {
      return
    }

    setBusyKey(`delete-${shelf.id}`)
    setError(null)

    try {
      await onDeleteShelf(shelf.id)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete shelf.')
    } finally {
      setBusyKey(null)
    }
  }

  const handleRemoveDomain = async (shelfId: number, domain: string) => {
    setBusyKey(`domain-${shelfId}-${domain}`)
    setError(null)

    try {
      await onRemoveDomain(shelfId, domain)
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Failed to remove domain.')
    } finally {
      setBusyKey(null)
    }
  }

  return (
    <ShelfModal
      title="Manage shelves"
      description="Create, rename, delete shelves, and remove saved domain rules."
      onClose={onClose}
    >
      <div className="space-y-5">
        <div className="space-y-2 rounded-lg border bg-slate-50 p-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <Label htmlFor="create-shelf-name" className="shrink-0">
              Create shelf
            </Label>
            <input
              id="create-shelf-name"
              type="text"
              value={newShelfName}
              onChange={(event) => setNewShelfName(event.target.value)}
              placeholder="work, funny, important..."
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              disabled={busyKey !== null}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void handleCreateShelf()
              }}
              className="lg:shrink-0"
              disabled={busyKey !== null}
            >
              {busyKey === 'create' ? <Loader2 className="size-4 animate-spin" /> : null}
              Create
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {sortedShelves.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No shelves yet.
            </div>
          ) : (
            sortedShelves.map((shelf) => {
              const renameValue = renameValues[shelf.id] ?? shelf.name

              return (
                <div key={shelf.id} className="space-y-3 rounded-lg border p-4">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(event) =>
                        setRenameValues((previous) => ({
                          ...previous,
                          [shelf.id]: event.target.value,
                        }))
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      disabled={busyKey !== null}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          void handleRenameShelf(shelf)
                        }}
                        className="gap-2"
                        disabled={busyKey !== null}
                      >
                        {busyKey === `rename-${shelf.id}` ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Pencil className="size-4" />
                        )}
                        Rename
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => {
                          void handleDeleteShelf(shelf)
                        }}
                        className="gap-2"
                        disabled={busyKey !== null}
                      >
                        {busyKey === `delete-${shelf.id}` ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                        Delete
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Domain rules</div>
                    {shelf.domains.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No domain rules for this shelf.</div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {shelf.domains.map((domain) => (
                          <div
                            key={`${shelf.id}-${domain}`}
                            className="inline-flex items-center gap-2 rounded-full border bg-slate-50 px-3 py-1 text-sm"
                          >
                            <span>{domain}</span>
                            <button
                              type="button"
                              onClick={() => {
                                void handleRemoveDomain(shelf.id, domain)
                              }}
                              className="rounded-full text-muted-foreground transition-colors hover:text-foreground"
                              aria-label={`Remove ${domain} from ${shelf.name}`}
                              disabled={busyKey !== null}
                            >
                              {busyKey === `domain-${shelf.id}-${domain}` ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <X className="size-3" />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        <div className="flex justify-end">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busyKey !== null}>
            Close
          </Button>
        </div>
      </div>
    </ShelfModal>
  )
}
