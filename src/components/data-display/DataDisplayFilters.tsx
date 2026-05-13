import { ChevronDown, ChevronUp, Search, SlidersHorizontal } from 'lucide-react'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Switch } from '../ui/switch'
import { DateRangeFilter, type DateFilterValue } from '../ui/date-range-filter'
import { PLATFORM_OPTIONS, type SupportedPlatform } from '../../lib/platforms'
import type { Shelf } from '../../types/pocket'
import { cn } from '../../lib/utils'
import { PlatformIcon } from './dataDisplayBadges'

export type BuiltInDateView = 'none' | 'added_this_week' | 'months_1_to_6_old' | 'older_than_1_year'

const BUILT_IN_DATE_VIEW_OPTIONS: Array<{ value: BuiltInDateView; label: string }> = [
  { value: 'added_this_week', label: 'Added this week' },
  { value: 'months_1_to_6_old', label: '1-6 months old' },
  { value: 'older_than_1_year', label: 'Older than 1 year' },
]

interface DataDisplayFiltersProps {
  id: string
  searchQuery: string
  hasAnyTags: boolean
  activeFilterCount: number
  isFiltersOpen: boolean
  hasActiveFilters: boolean
  hasProblematicItems: boolean
  onlyHomepages: boolean
  onlyProblematic: boolean
  selectedPlatforms: Record<SupportedPlatform, boolean>
  shelves: Shelf[]
  selectedShelfIds: number[]
  dateFilter: DateFilterValue
  builtInDateView: BuiltInDateView
  onToggleFiltersOpen: () => void
  onSearchQueryChange: (value: string) => void
  onResetFilters: () => void
  onOnlyHomepagesChange: (checked: boolean) => void
  onOnlyProblematicChange: (checked: boolean) => void
  onTogglePlatformFilter: (platform: SupportedPlatform) => void
  onToggleShelfFilter: (shelfId: number) => void
  onDateFilterChange: (value: DateFilterValue) => void
  onBuiltInDateViewChange: (value: BuiltInDateView) => void
}

export function DataDisplayFilters({
  id,
  searchQuery,
  hasAnyTags,
  activeFilterCount,
  isFiltersOpen,
  hasActiveFilters,
  hasProblematicItems,
  onlyHomepages,
  onlyProblematic,
  selectedPlatforms,
  shelves,
  selectedShelfIds,
  dateFilter,
  builtInDateView,
  onToggleFiltersOpen,
  onSearchQueryChange,
  onResetFilters,
  onOnlyHomepagesChange,
  onOnlyProblematicChange,
  onTogglePlatformFilter,
  onToggleShelfFilter,
  onDateFilterChange,
  onBuiltInDateViewChange,
}: DataDisplayFiltersProps) {
  return (
    <div className="mb-3 lg:mb-6">
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
            <div className="mb-4 flex justify-start">
              <Button variant="secondary" size="sm" onClick={onResetFilters}>
                🔄️ Reset filters
              </Button>
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-[38.2%_1fr]">
            <fieldset className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">Shelves</div>
                {shelves.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No shelves created yet.</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {shelves.map((shelf) => {
                      const isSelected = selectedShelfIds.includes(shelf.id)

                      return (
                        <Button
                          key={shelf.id}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onToggleShelfFilter(shelf.id)}
                          className={cn(
                            'gap-2',
                            isSelected &&
                              'border-slate-900 bg-slate-900 text-slate-50 hover:bg-slate-800 hover:text-slate-50'
                          )}
                          aria-pressed={isSelected}
                        >
                          {shelf.name}
                        </Button>
                      )
                    })}
                  </div>
                )}
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

              <div className="space-y-3 md:flex md:flex-wrap md:items-center md:gap-4 md:space-y-0">
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

                {hasProblematicItems && (
                  <div className="inline-flex items-center gap-2">
                    <Switch
                      id={`${id}-problematic-filter`}
                      checked={onlyProblematic}
                      onCheckedChange={onOnlyProblematicChange}
                      aria-label="Show only problematic URLs"
                    />
                    <Label htmlFor={`${id}-problematic-filter`} className="text-sm font-medium">
                      Only problematic
                    </Label>
                  </div>
                )}
              </div>
            </fieldset>

            <div className="space-y-4">
              <DateRangeFilter value={dateFilter} onChange={onDateFilterChange} />

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Date filter presets</legend>
                <div className="flex flex-wrap gap-2">
                  {BUILT_IN_DATE_VIEW_OPTIONS.map((option) => {
                    const isSelected = builtInDateView === option.value

                    return (
                      <Button
                        key={option.value}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          onBuiltInDateViewChange(isSelected ? 'none' : option.value)
                        }
                        className={cn(
                          'gap-2',
                          isSelected &&
                            'border-slate-900 bg-slate-900 text-slate-50 hover:bg-slate-800 hover:text-slate-50'
                        )}
                        aria-pressed={isSelected}
                      >
                        {option.label}
                      </Button>
                    )
                  })}
                </div>
              </fieldset>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
