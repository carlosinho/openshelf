import { SortAsc, SortDesc } from 'lucide-react'
import { Button } from '../ui/button'

type SortDirection = 'asc' | 'desc'

const PAGE_SIZE_OPTIONS = [50, 100, 200, 500, 1000] as const

interface DataDisplayListControlsProps {
  sortDirection: SortDirection
  itemsPerPage: number
  onToggleSortDirection: () => void
  onItemsPerPageChange: (size: number) => void
}

export function DataDisplayListControls({
  sortDirection,
  itemsPerPage,
  onToggleSortDirection,
  onItemsPerPageChange,
}: DataDisplayListControlsProps) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/30 p-3 sm:p-4 lg:mb-6">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Sort:</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleSortDirection}
          className="flex items-center gap-1"
        >
          {sortDirection === 'desc' ? (
            <>
              <SortDesc className="w-4 h-4" />
              Newest first
            </>
          ) : (
            <>
              <SortAsc className="w-4 h-4" />
              Oldest first
            </>
          )}
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <label
          htmlFor="openshelf-items-per-page"
          className="text-sm font-medium text-muted-foreground sm:hidden"
        >
          Per page:
        </label>
        <span className="hidden text-sm font-medium text-muted-foreground sm:inline">
          Items per page:
        </span>

        <select
          id="openshelf-items-per-page"
          value={itemsPerPage}
          onChange={(event) => onItemsPerPageChange(Number(event.target.value))}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm sm:hidden"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>

        <div className="hidden gap-1 sm:flex">
          {PAGE_SIZE_OPTIONS.map((size) => (
            <Button
              key={size}
              variant={itemsPerPage === size ? 'default' : 'outline'}
              size="sm"
              onClick={() => onItemsPerPageChange(size)}
              className="h-8 px-2 text-xs"
            >
              {size}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
