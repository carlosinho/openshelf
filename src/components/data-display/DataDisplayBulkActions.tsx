import { Download, Trash2 } from 'lucide-react'
import { Button } from '../ui/button'

interface DataDisplayBulkActionsProps {
  selectedCount: number
  onExportSelected: () => void
  onClearSelection: () => void
  onDeleteSelected: () => void
}

export function DataDisplayBulkActions({
  selectedCount,
  onExportSelected,
  onClearSelection,
  onDeleteSelected,
}: DataDisplayBulkActionsProps) {
  if (selectedCount === 0) {
    return null
  }

  return (
    <div className="mb-4 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-4">
      <div className="flex items-center gap-2 text-sm text-blue-800">
        <span className="font-medium">
          {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="default" onClick={onExportSelected} className="gap-2">
          <Download className="opacity-60" size={16} aria-hidden="true" />
          Export selected
        </Button>
        <Button variant="secondary" onClick={onClearSelection}>
          Clear selection
        </Button>
        <Button variant="destructive" onClick={onDeleteSelected} className="gap-2">
          <Trash2 className="opacity-60" size={16} aria-hidden="true" />
          Delete selected
        </Button>
      </div>
    </div>
  )
}
