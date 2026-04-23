import type { Ref } from 'react'
import { ChevronDown, Download, Plus, Sparkles, Trash2, Upload, X } from 'lucide-react'
import { Button } from '../ui/button'
import { Tooltip } from '../ui/tooltip'

interface DataDisplayHeaderActionsProps {
  actionsMenuRef: Ref<HTMLDivElement>
  isActionsOpen: boolean
  hasScopedView: boolean
  unreadFilteredCount: number
  archivedCount: number
  isValidationRunning: boolean
  onToggleActionsOpen: () => void
  onExportAll: () => void
  onExportFiltered: () => void
  onToggleImportCsv: () => void
  onStartValidation: () => void
  onCancelValidation: () => void
  onClearArchived: () => void
  onToggleAddLink: () => void
}

export function DataDisplayHeaderActions({
  actionsMenuRef,
  isActionsOpen,
  hasScopedView,
  unreadFilteredCount,
  archivedCount,
  isValidationRunning,
  onToggleActionsOpen,
  onExportAll,
  onExportFiltered,
  onToggleImportCsv,
  onStartValidation,
  onCancelValidation,
  onClearArchived,
  onToggleAddLink,
}: DataDisplayHeaderActionsProps) {
  return (
    <>
      <div className="relative" ref={actionsMenuRef}>
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleActionsOpen}
          className="gap-2"
          aria-haspopup="menu"
          aria-expanded={isActionsOpen}
        >
          <Sparkles className="size-4 opacity-60" aria-hidden="true" />
          Actions
          <ChevronDown className="size-4 opacity-60" aria-hidden="true" />
        </Button>
        {isActionsOpen && (
          <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-lg border bg-background p-1 shadow-lg">
            <Button
              variant="ghost"
              size="sm"
              onClick={onExportAll}
              className="w-full justify-start gap-2"
            >
              <Download className="size-4 opacity-60" aria-hidden="true" />
              Export all
            </Button>
            {hasScopedView && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onExportFiltered}
                className="w-full justify-start gap-2"
              >
                <Download className="size-4 opacity-60" aria-hidden="true" />
                Export current view
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleImportCsv}
              className="w-full justify-start gap-2"
            >
              <Upload className="size-4 opacity-60" aria-hidden="true" />
              Import CSV
            </Button>
            {!isValidationRunning ? (
              <Tooltip content="Checks only links from unread items in the current view">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onStartValidation}
                  disabled={unreadFilteredCount === 0}
                  className="w-full justify-start gap-2"
                >
                  <Sparkles className="size-4 opacity-60" aria-hidden="true" />
                  Check URLs
                </Button>
              </Tooltip>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancelValidation}
                className="w-full justify-start gap-2"
              >
                <X className="size-4 opacity-60" aria-hidden="true" />
                Stop URL check
              </Button>
            )}
            {archivedCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearArchived}
                className="w-full justify-start gap-2 text-red-600 hover:text-red-700"
              >
                <Trash2 className="size-4 opacity-60" aria-hidden="true" />
                Clear all archived
              </Button>
            )}
          </div>
        )}
      </div>
      <Button
        variant="default"
        size="sm"
        onClick={onToggleAddLink}
        className="gap-2 border border-amber-200 bg-amber-100 text-amber-900 hover:bg-amber-200"
      >
        <Plus className="opacity-60" size={16} aria-hidden="true" />
        Add link
      </Button>
    </>
  )
}
