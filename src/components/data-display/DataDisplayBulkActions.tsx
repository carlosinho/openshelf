import { Archive, Download, RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '../ui/button'

interface DataDisplayBulkActionsProps {
  selectedCount: number
  selectedUnreadCount: number
  selectedArchivedCount: number
  onExportSelected: () => void
  onClearSelection: () => void
  onToggleArchivedSelected: () => void
  onDeleteSelected: () => void
}

export function DataDisplayBulkActions({
  selectedCount,
  selectedUnreadCount,
  selectedArchivedCount,
  onExportSelected,
  onClearSelection,
  onToggleArchivedSelected,
  onDeleteSelected,
}: DataDisplayBulkActionsProps) {
  if (selectedCount === 0) {
    return null
  }

  const isOnlyArchivedSelected = selectedArchivedCount > 0 && selectedUnreadCount === 0
  const archiveButtonLabel =
    selectedUnreadCount > 0 && selectedArchivedCount > 0
      ? 'Archive/unarchive selected'
      : isOnlyArchivedSelected
        ? 'Move selected to unread'
        : 'Archive selected'

  return (
    <div className="mb-4 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-4">
      <div className="flex items-center gap-3">
        <Button variant="secondary" onClick={onClearSelection}>
          Clear selection
        </Button>
        <div className="flex items-center gap-2 text-sm text-blue-800">
        <span className="font-medium">
          {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
        </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onExportSelected} className="gap-2">
          <Download className="opacity-60" size={16} aria-hidden="true" />
          Export selected
        </Button>
        <Button variant="default" onClick={onToggleArchivedSelected} className="gap-2">
          {isOnlyArchivedSelected ? (
            <RotateCcw className="opacity-60" size={16} aria-hidden="true" />
          ) : (
            <Archive className="opacity-60" size={16} aria-hidden="true" />
          )}
          {archiveButtonLabel}
        </Button>
        <Button variant="destructive" onClick={onDeleteSelected} className="gap-2">
          <Trash2 className="opacity-60" size={16} aria-hidden="true" />
          Delete selected
        </Button>
      </div>
    </div>
  )
}
