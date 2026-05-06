import { useMemo, useState } from 'react'
import { Globe, Link2, Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { Shelf } from '../../types/pocket'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { RadioGroup, RadioGroupItem } from '../ui/radio-group'
import { ShelfModal } from './ShelfModal'

interface ShelfAssignmentDialogProps {
  title: string
  description: string
  shelves: Shelf[]
  existingShelfIds?: number[]
  itemCount: number
  availableDomains: string[]
  onClose: () => void
  onCreateShelf: (name: string) => Promise<Shelf>
  onAddItemsToShelves: (shelfIds: number[]) => Promise<void>
  onRemoveItemsFromShelves: (shelfIds: number[]) => Promise<void>
  onAddDomainToShelves: (shelfIds: number[], domain: string) => Promise<void>
}

export function ShelfAssignmentDialog({
  title,
  description,
  shelves,
  existingShelfIds = [],
  itemCount,
  availableDomains,
  onClose,
  onCreateShelf,
  onAddItemsToShelves,
  onRemoveItemsFromShelves,
  onAddDomainToShelves,
}: ShelfAssignmentDialogProps) {
  const [selectedShelfIds, setSelectedShelfIds] = useState<number[]>(() => {
    return existingShelfIds.filter((shelfId) => shelves.some((shelf) => shelf.id === shelfId))
  })
  const [mode, setMode] = useState<'items' | 'domain'>('items')
  const [newShelfName, setNewShelfName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isCreatingShelf, setIsCreatingShelf] = useState(false)

  const availableShelves = useMemo(
    () => shelves.slice().sort((left, right) => left.name.localeCompare(right.name)),
    [shelves]
  )
  const canUseDomainMode = availableDomains.length > 0
  const showAddMode = itemCount === 1
  const selectedDomain = availableDomains[0] ?? ''
  const canSaveSelection = selectedShelfIds.length > 0 || existingShelfIds.length > 0

  const handleCreateShelf = async () => {
    const trimmedName = newShelfName.trim()

    if (!trimmedName) {
      setError('Enter a shelf name first.')
      return
    }

    setIsCreatingShelf(true)
    setError(null)

    try {
      const shelf = await onCreateShelf(trimmedName)
      setSelectedShelfIds((previous) =>
        previous.includes(shelf.id) ? previous : [...previous, shelf.id]
      )
      setNewShelfName('')
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Failed to create shelf.')
    } finally {
      setIsCreatingShelf(false)
    }
  }

  const handleSubmit = async () => {
    if (!canSaveSelection) {
      setError('Choose at least one shelf.')
      return
    }

    if (showAddMode && mode === 'domain' && !selectedDomain) {
      setError('No valid domain found for this item.')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const shelvesToRemove = existingShelfIds.filter((shelfId) => !selectedShelfIds.includes(shelfId))
      const shelvesToAdd = selectedShelfIds.filter((shelfId) => !existingShelfIds.includes(shelfId))

      if (showAddMode && mode === 'domain') {
        await onAddDomainToShelves(selectedShelfIds, selectedDomain)
      } else {
        if (shelvesToAdd.length > 0) {
          await onAddItemsToShelves(shelvesToAdd)
        }
      }

      if (shelvesToRemove.length > 0) {
        await onRemoveItemsFromShelves(shelvesToRemove)
      }

      onClose()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to update shelf.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <ShelfModal title={title} description={description} onClose={onClose}>
      <div className="space-y-5">
        {showAddMode ? (
          <div className="space-y-3">
            <div className="text-sm font-medium">Add mode</div>
            <RadioGroup
              value={mode}
              onValueChange={(value) => setMode(value as 'items' | 'domain')}
              className="gap-3"
            >
              <label className="flex items-start gap-3 rounded-lg border p-3">
                <RadioGroupItem value="items" id="shelf-mode-items" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Link2 className="size-4" />
                    Add selected link
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Add only the current selection to the shelf.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 rounded-lg border p-3 ${
                  canUseDomainMode ? '' : 'cursor-not-allowed opacity-60'
                }`}
              >
                <RadioGroupItem
                  value="domain"
                  id="shelf-mode-domain"
                  disabled={!canUseDomainMode}
                />
                <div className="w-full space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    <Globe className="size-4" />
                    Add entire domain
                    {canUseDomainMode ? (
                      <span className="rounded-full border bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {selectedDomain}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Current and future links from that root domain will land on this shelf.
                  </p>
                  {!canUseDomainMode ? (
                    <div className="text-sm text-muted-foreground">No valid domain found for this selection.</div>
                  ) : null}
                </div>
              </label>
            </RadioGroup>
          </div>
        ) : null}

        <div className="space-y-3">
          <Label>Pick shelf</Label>
          {availableShelves.length === 0 ? (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No shelves yet.
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {availableShelves.map((shelf) => {
                const isExisting = existingShelfIds.includes(shelf.id)
                const isSelected = selectedShelfIds.includes(shelf.id)

                return (
                  <button
                    key={shelf.id}
                    type="button"
                    onClick={() =>
                      setSelectedShelfIds((previous) =>
                        previous.includes(shelf.id)
                          ? previous.filter((id) => id !== shelf.id)
                          : [...previous, shelf.id]
                      )
                    }
                    disabled={isSaving}
                    className={cn(
                      'rounded-lg border p-3 text-left transition-colors',
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-slate-50'
                        : 'bg-background hover:bg-slate-50',
                      isSaving && 'cursor-not-allowed opacity-60'
                    )}
                    aria-pressed={isSelected}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium">{shelf.name}</div>
                        <div
                          className={cn(
                            'text-sm',
                            isSelected ? 'text-slate-300' : 'text-muted-foreground'
                          )}
                        >
                          {isExisting ? 'Already added' : 'Click to select'}
                        </div>
                      </div>
                      {isExisting ? (
                        <span
                          className={cn(
                            'shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium',
                            isSelected
                              ? 'border-slate-500 bg-slate-800 text-slate-100'
                              : 'bg-slate-100 text-slate-700'
                          )}
                        >
                          {isSelected ? 'Selected' : 'Added'}
                        </span>
                      ) : null}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="space-y-2 rounded-lg border bg-slate-50 p-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <Label htmlFor="new-shelf-name" className="shrink-0">
              Create shelf
            </Label>
            <input
              id="new-shelf-name"
              type="text"
              value={newShelfName}
              onChange={(event) => setNewShelfName(event.target.value)}
              placeholder="work, funny, important..."
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              disabled={isCreatingShelf || isSaving}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void handleCreateShelf()
              }}
              disabled={isCreatingShelf || isSaving}
              className="lg:shrink-0"
            >
              {isCreatingShelf ? <Loader2 className="size-4 animate-spin" /> : null}
              Create
            </Button>
          </div>
        </div>

        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              void handleSubmit()
            }}
            disabled={availableShelves.length === 0 || !canSaveSelection || isSaving}
            className="gap-2"
          >
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save
          </Button>
        </div>
      </div>
    </ShelfModal>
  )
}
