import { SortAsc, SortDesc } from 'lucide-react'
import { Button } from '../ui/button'

type SortDirection = 'asc' | 'desc'

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
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg bg-muted/30 p-4">
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
        <span className="text-sm font-medium text-muted-foreground">Items per page:</span>
        <div className="flex gap-1">
          {[50, 100, 200, 500, 1000].map((size) => (
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
