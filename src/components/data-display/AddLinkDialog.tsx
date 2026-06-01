import { useEffect, type Ref } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '../ui/button'
import { ShelfModal } from './ShelfModal'

interface AddLinkDialogProps {
  urlInputId: string
  newUrl: string
  addError: string | null
  isAddingLoading: boolean
  urlInputRef: Ref<HTMLInputElement>
  onNewUrlChange: (value: string) => void
  onSubmit: () => void
  onClose: () => void
}

export function AddLinkDialog({
  urlInputId,
  newUrl,
  addError,
  isAddingLoading,
  urlInputRef,
  onNewUrlChange,
  onSubmit,
  onClose,
}: AddLinkDialogProps) {
  useEffect(() => {
    if (typeof urlInputRef === 'function') {
      return
    }

    urlInputRef?.current?.focus()
    urlInputRef?.current?.select()
  }, [urlInputRef])

  return (
    <ShelfModal
      title="Add link"
      onClose={onClose}
      panelClassName="border border-amber-200 bg-amber-50 shadow-xl"
      headerClassName="border-b border-amber-200"
    >
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit()
        }}
      >
        <input
          ref={urlInputRef}
          id={urlInputId}
          type="url"
          placeholder="https://example.com/article"
          value={newUrl}
          onChange={(event) => onNewUrlChange(event.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" disabled={isAddingLoading}>
            {isAddingLoading ? 'Adding…' : 'Add'}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
        {addError ? (
          <div className="flex items-center gap-1 text-xs text-destructive">
            <AlertTriangle className="size-3 shrink-0" aria-hidden="true" />
            <span>{addError}</span>
          </div>
        ) : null}
      </form>
    </ShelfModal>
  )
}
