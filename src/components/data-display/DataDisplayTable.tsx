import { ExternalLink, HelpCircle, Trash2 } from 'lucide-react'
import { Checkbox } from '../ui/checkbox'
import { Tooltip } from '../ui/tooltip'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table'
import { detectPlatformFromUrl, type SupportedPlatform } from '../../lib/platforms'
import { formatDate, formatDateTime } from '../../lib/utils'
import { PocketItem } from '../../types/pocket'
import { DateFilterValue } from '../ui/date-range-filter'
import { PlatformBadge, StatusBadge, ValidationBadge } from './dataDisplayBadges'

interface DataDisplayTableProps {
  id: string
  filteredAndSortedData: PocketItem[]
  paginatedData: PocketItem[]
  selectedItems: Set<number>
  hasAnyTags: boolean
  searchQuery: string
  hasSelectedStatuses: boolean
  dateFilter: DateFilterValue
  onlyHomepages: boolean
  selectedPlatforms: Record<SupportedPlatform, boolean>
  onTogglePageSelection: (checked: boolean) => void
  onToggleItemSelection: (itemId: number, checked: boolean) => void
  onDeleteSingle: (itemId: number) => void
}

export function DataDisplayTable({
  id,
  filteredAndSortedData,
  paginatedData,
  selectedItems,
  hasAnyTags,
  searchQuery,
  hasSelectedStatuses,
  dateFilter,
  onlyHomepages,
  selectedPlatforms,
  onTogglePageSelection,
  onToggleItemSelection,
  onDeleteSingle,
}: DataDisplayTableProps) {
  if (filteredAndSortedData.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="text-muted-foreground">
          {searchQuery ||
          !hasSelectedStatuses ||
          dateFilter.mode !== 'none' ||
          onlyHomepages ||
          Object.values(selectedPlatforms).some(Boolean)
            ? 'No items match your filters.'
            : 'No items to display.'}
        </div>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-[80px]">
            <Checkbox
              id={id}
              checked={
                paginatedData.length > 0 &&
                paginatedData.every((item) => selectedItems.has(item.id))
              }
              onChange={(event) => onTogglePageSelection(event.target.checked)}
            />
          </TableHead>
          <TableHead className="w-[40%]">Title</TableHead>
          <TableHead className="w-[40%]">URL</TableHead>
          <TableHead className="w-[12%]">Date Added</TableHead>
          <TableHead className="text-center">
            <Tooltip content="Platform icon, U - unread, A - archived, X - problem resolving">
              <div className="flex items-center justify-center gap-1">
                Status
                <HelpCircle className="w-3 h-3 text-muted-foreground" />
              </div>
            </Tooltip>
          </TableHead>
          {hasAnyTags && <TableHead>Tags</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {paginatedData.map((item, index) => {
          const platform = detectPlatformFromUrl(item.url)

          return (
            <TableRow
              key={item.id}
              data-state={selectedItems.has(item.id) ? 'selected' : undefined}
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`table-checkbox-${index}`}
                    checked={selectedItems.has(item.id)}
                    onChange={(event) =>
                      onToggleItemSelection(item.id, event.target.checked)
                    }
                  />
                  <ButtonDelete onClick={() => onDeleteSingle(item.id)} />
                </div>
              </TableCell>
              <TableCell className="font-medium">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 transition-colors hover:text-primary"
                >
                  <ExternalLink
                    className="size-3.5 flex-shrink-0 text-current"
                    aria-hidden="true"
                  />
                  <span className="break-words">{item.title || 'Untitled'}</span>
                </a>
              </TableCell>
              <TableCell className="font-mono text-xs">
                <span className="break-all">{item.url}</span>
              </TableCell>
              <TableCell>
                <span title={formatDateTime(item.time_added)}>
                  {formatDate(item.time_added)}
                </span>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <PlatformBadge platform={platform} />
                  <StatusBadge status={item.status} />
                  <ValidationBadge validationStatus={item.validation_status} />
                </div>
              </TableCell>
              {hasAnyTags && (
                <TableCell>
                  {item.tags && item.tags.trim() !== '' && (
                    <span className="break-words text-xs text-muted-foreground">
                      {item.tags}
                    </span>
                  )}
                </TableCell>
              )}
            </TableRow>
          )
        })}
      </TableBody>
      {selectedItems.size > 0 && (
        <TableFooter className="bg-transparent">
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={hasAnyTags ? 6 : 5}>
              {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
            </TableCell>
          </TableRow>
        </TableFooter>
      )}
    </Table>
  )
}

function ButtonDelete({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-6 w-6 items-center justify-center rounded-sm p-0 text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
      aria-label="Delete item"
    >
      <Trash2 className="w-3 h-3" />
    </button>
  )
}
