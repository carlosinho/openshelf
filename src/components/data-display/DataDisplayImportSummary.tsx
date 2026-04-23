import { CheckCircle, X } from 'lucide-react'
import { Button } from '../ui/button'

interface DataDisplayImportSummaryProps {
  importSummary: {
    imported: number
    duplicates: number
    errors: number
  }
  onDismiss: () => void
}

export function DataDisplayImportSummary({
  importSummary,
  onDismiss,
}: DataDisplayImportSummaryProps) {
  return (
    <div
      className="mb-8 w-full rounded-md border border-green-200 bg-green-50 px-4 py-3 shadow-sm"
      style={{
        animation: 'slideInFromTop 0.5s ease-out',
      }}
    >
      <div className="flex gap-2">
        <div className="grow">
          <div className="flex items-center text-sm font-medium text-green-800">
            <CheckCircle
              className="me-3 -mt-0.5 inline-flex text-green-600"
              size={16}
              aria-hidden="true"
            />
            CSV import finished.
          </div>
          <div className="mt-1 ml-7 text-xs text-green-700">
            Added {importSummary.imported} new item
            {importSummary.imported !== 1 ? 's' : ''} • skipped {importSummary.duplicates}{' '}
            duplicate{importSummary.duplicates !== 1 ? 's' : ''}
            {importSummary.errors > 0
              ? ` • ${importSummary.errors} row error${
                  importSummary.errors !== 1 ? 's' : ''
                } reported`
              : ''}
          </div>
        </div>
        <Button
          variant="ghost"
          className="group -my-1.5 -me-2 size-8 shrink-0 p-0 hover:bg-green-100"
          aria-label="Close notification"
          onClick={onDismiss}
        >
          <X
            size={16}
            className="text-green-600 opacity-60 transition-opacity group-hover:opacity-100"
            aria-hidden="true"
          />
        </Button>
      </div>
    </div>
  )
}
