import { ChevronDown, ChevronUp, Search, SlidersHorizontal } from 'lucide-react'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'
import { DateRangeFilter, type DateFilterValue } from '../ui/date-range-filter'
import { PLATFORM_OPTIONS, type SupportedPlatform } from '../../lib/platforms'
import { cn } from '../../lib/utils'
import { PlatformIcon } from './dataDisplayBadges'

interface DataDisplayFiltersProps {
  id: string
  searchQuery: string
  hasAnyTags: boolean
  activeFilterCount: number
  isFiltersOpen: boolean
  hasActiveFilters: boolean
  onlyHomepages: boolean
  selectedPlatforms: Record<SupportedPlatform, boolean>
  dateFilter: DateFilterValue
  onToggleFiltersOpen: () => void
  onSearchQueryChange: (value: string) => void
  onResetFilters: () => void
  onOnlyHomepagesChange: (checked: boolean) => void
  onTogglePlatformFilter: (platform: SupportedPlatform) => void
  onDateFilterChange: (value: DateFilterValue) => void
}

export function DataDisplayFilters({
  id,
  searchQuery,
  hasAnyTags,
  activeFilterCount,
  isFiltersOpen,
  hasActiveFilters,
  onlyHomepages,
  selectedPlatforms,
  dateFilter,
  onToggleFiltersOpen,
  onSearchQueryChange,
  onResetFilters,
  onOnlyHomepagesChange,
  onTogglePlatformFilter,
  onDateFilterChange,
}: DataDisplayFiltersProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleFiltersOpen}
          className="gap-2"
        >
          <SlidersHorizontal className="size-4 opacity-60" aria-hidden="true" />
          Filters
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-slate-900 px-2 py-0.5 text-xs text-white">
              {activeFilterCount}
            </span>
          )}
          {isFiltersOpen ? (
            <ChevronUp className="size-4 opacity-60" aria-hidden="true" />
          ) : (
            <ChevronDown className="size-4 opacity-60" aria-hidden="true" />
          )}
        </Button>

        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder={hasAnyTags ? 'Search titles, URLs, or tags...' : 'Search titles and URLs...'}
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
      </div>

      {isFiltersOpen && (
        <div className="mt-3 rounded-lg border bg-card p-4">
          {hasActiveFilters && (
            <div className="mb-4 flex justify-end">
              <Button variant="ghost" size="sm" onClick={onResetFilters}>
                Reset filters
              </Button>
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-[38.2%_1fr]">
            <fieldset className="space-y-4">
              <div className="inline-flex items-center gap-2">
                <Switch
                  id={`${id}-homepage-filter`}
                  checked={onlyHomepages}
                  onCheckedChange={onOnlyHomepagesChange}
                  aria-label="Show only homepages"
                />
                <Label htmlFor={`${id}-homepage-filter`} className="text-sm font-medium">
                  Only homepages
                </Label>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium">Platforms</div>
                <div className="flex flex-wrap gap-2">
                  {PLATFORM_OPTIONS.map((platform) => {
                    const isSelected = selectedPlatforms[platform.key]

                    return (
                      <Button
                        key={platform.key}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onTogglePlatformFilter(platform.key)}
                        className={cn(
                          'gap-2',
                          isSelected &&
                            'border-slate-900 bg-slate-900 text-slate-50 hover:bg-slate-800 hover:text-slate-50'
                        )}
                        aria-pressed={isSelected}
                      >
                        <PlatformIcon platform={platform.key} />
                        {platform.label}
                      </Button>
                    )
                  })}
                </div>
              </div>
            </fieldset>

            <DateRangeFilter value={dateFilter} onChange={onDateFilterChange} />
          </div>
        </div>
      )}
    </div>
  )
}
