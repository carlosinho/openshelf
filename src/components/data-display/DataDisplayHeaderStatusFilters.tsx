import { Archive, Inbox } from 'lucide-react'
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
    <div className="flex flex-wrap items-center justify-center gap-2 lg:gap-3">
      {(
        [
          {
            key: 'unread' as const,
            label: 'Unread',
            count: unreadCount,
            Icon: Inbox,
            className: selectedStatuses.unread
              ? 'border-amber-300 bg-amber-100 text-amber-950'
              : 'border-border bg-background text-foreground',
          },
          {
            key: 'archive' as const,
            label: 'Archive',
            count: archivedCount,
            Icon: Archive,
            className: selectedStatuses.archive
              ? 'border-slate-300 bg-slate-100 text-slate-950'
              : 'border-border bg-background text-foreground',
          },
        ]
      ).map(({ key, label, count, Icon, className }) => (
        <label
          key={key}
          className={cn(
            'inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-1.5 text-sm font-medium shadow-sm transition-colors hover:bg-muted/70 lg:px-4 lg:py-2',
            className
          )}
          title={`${label} (${count})`}
        >
          <Checkbox
            checked={selectedStatuses[key]}
            onChange={() => onToggleStatusFilter(key)}
            aria-label={`${label} (${count})`}
            className="size-4 accent-slate-900"
          />
          <Icon className="size-4 lg:hidden" aria-hidden="true" />
          <span className="hidden lg:inline">{label}</span>
        </label>
      ))}
    </div>
  )
}
