import type { Ref } from 'react'
import { AlertTriangle } from 'lucide-react'
import { FileUpload } from '../FileUpload'
import { Button } from '../ui/button'

interface ImportResultSummary {
  imported: number
  duplicates: number
  errors: string[]
}

interface DataDisplayHeaderPanelsProps {
  id: string
  isImportingCsv: boolean
  isAddingLink: boolean
  newUrl: string
  addError: string | null
  isAddingLoading: boolean
  addLinkInputRef: Ref<HTMLInputElement>
  onRefresh?: () => Promise<void> | void
  onImportResult: (result: ImportResultSummary) => void
  onNewUrlChange: (value: string) => void
  onSubmitAddLink: () => void
  onCancelAddLink: () => void
}

export function DataDisplayHeaderPanels({
  id,
  isImportingCsv,
  isAddingLink,
  newUrl,
  addError,
  isAddingLoading,
  addLinkInputRef,
  onRefresh,
  onImportResult,
  onNewUrlChange,
  onSubmitAddLink,
  onCancelAddLink,
}: DataDisplayHeaderPanelsProps) {
  return (
    <div className="space-y-3">
      {isImportingCsv && (
        <FileUpload
          className="w-full"
          onImportComplete={async () => {
            await onRefresh?.()
          }}
          onImportResult={onImportResult}
        />
      )}

      {isAddingLink && (
        <div className="w-full space-y-2 rounded-md border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault()
              onSubmitAddLink()
            }}
          >
            <input
              ref={addLinkInputRef}
              id={`${id}-new-url`}
              type="url"
              placeholder="https://example.com/article"
              value={newUrl}
              onChange={(event) => onNewUrlChange(event.target.value)}
              className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                type="submit"
                disabled={isAddingLoading}
                className="sm:w-auto"
              >
                {isAddingLoading ? 'Adding…' : 'Add'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={onCancelAddLink}
              >
                Cancel
              </Button>
            </div>
          </form>
          {addError && (
            <div className="flex items-center gap-1 text-xs text-destructive">
              <AlertTriangle className="w-3 h-3" aria-hidden="true" />
              <span>{addError}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
