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
    <div className="mb-3 flex flex-row flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 sm:p-4 lg:mb-4 lg:gap-3">
      <div className="flex flex-wrap items-center gap-2 lg:gap-3">
        <Button variant="secondary" onClick={onClearSelection}>
          <span className="lg:hidden">Clear</span>
          <span className="hidden lg:inline">Clear selection</span>
        </Button>
        <div className="flex items-center gap-2 text-sm text-blue-800">
          <span className="font-medium lg:hidden">{selectedCount} selected</span>
          <span className="hidden font-medium lg:inline">
            {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
          </span>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          onClick={onExportSelected}
          className="hidden gap-2 lg:inline-flex"
        >
          <Download className="opacity-60" size={16} aria-hidden="true" />
          Export selected
        </Button>
        <Button
          variant="default"
          onClick={onToggleArchivedSelected}
          className="gap-2"
          aria-label={archiveButtonLabel}
          title={archiveButtonLabel}
        >
          {isOnlyArchivedSelected ? (
            <RotateCcw className="opacity-60" size={16} aria-hidden="true" />
          ) : (
            <Archive className="opacity-60" size={16} aria-hidden="true" />
          )}
          <span className="hidden lg:inline">{archiveButtonLabel}</span>
        </Button>
        <Button
          variant="destructive"
          onClick={onDeleteSelected}
          className="gap-2"
          aria-label="Delete selected"
          title="Delete selected"
        >
          <Trash2 className="opacity-60" size={16} aria-hidden="true" />
          <span className="hidden lg:inline">Delete selected</span>
        </Button>
      </div>
    </div>
  )
}
