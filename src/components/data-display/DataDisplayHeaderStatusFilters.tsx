import { Checkbox } from '../ui/checkbox'
import { cn } from '../../lib/utils'

type StatusFilterKey = 'unread' | 'archive'

interface DataDisplayHeaderStatusFiltersProps {
  selectedStatuses: Record<StatusFilterKey, boolean>
  unreadCount: number
  archivedCount: number
  onToggleStatusFilter: (status: StatusFilterKey) => void
}

export function DataDisplayHeaderStatusFilters({
  selectedStatuses,
  unreadCount,
  archivedCount,
  onToggleStatusFilter,
}: DataDisplayHeaderStatusFiltersProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {([
        {
          key: 'unread' as const,
          label: 'Unread',
          count: unreadCount,
          className: selectedStatuses.unread
            ? 'border-amber-300 bg-amber-100 text-amber-950'
            : 'border-border bg-background text-foreground',
        },
        {
          key: 'archive' as const,
          label: 'Archive',
          count: archivedCount,
          className: selectedStatuses.archive
            ? 'border-slate-300 bg-slate-100 text-slate-950'
            : 'border-border bg-background text-foreground',
        },
      ]).map((option) => (
        <label
          key={option.key}
          className={cn(
            'inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-muted/70',
            option.className
          )}
        >
          <Checkbox
            checked={selectedStatuses[option.key]}
            onChange={() => onToggleStatusFilter(option.key)}
            aria-label={`${option.label} (${option.count})`}
            className="size-4 accent-slate-900"
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  )
}
