import React, { useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePagination } from '../hooks/use-pagination'
import { type SupportedPlatform, detectPlatformFromUrl } from '../lib/platforms'
import { ApiError, bulkDeleteItems, clearArchivedItems, createItem, patchItem } from '../lib/api'
import { PocketItem } from '../types/pocket'
import { exportToPocketCSV } from '../utils/csvParser'
import {
  validateUrls,
  type ValidationProgress,
  type ValidationState,
} from '../utils/urlValidator'
import { type DateFilterValue } from './ui/date-range-filter'
import { DataDisplayBulkActions } from './data-display/DataDisplayBulkActions'
import { DataDisplayFilters } from './data-display/DataDisplayFilters'
import { DataDisplayHeaderActions } from './data-display/DataDisplayHeaderActions'
import { DataDisplayHeaderPanels } from './data-display/DataDisplayHeaderPanels'
import { DataDisplayHeaderStatusFilters } from './data-display/DataDisplayHeaderStatusFilters'
import { DataDisplayImportSummary } from './data-display/DataDisplayImportSummary'
import { DataDisplayListControls } from './data-display/DataDisplayListControls'
import { DataDisplayPagination } from './data-display/DataDisplayPagination'
import { DataDisplayTable } from './data-display/DataDisplayTable'
import { DataDisplayValidationStatus } from './data-display/DataDisplayValidationStatus'
import { isHomepage } from './data-display/isHomepage'

interface DataDisplayProps {
  data: PocketItem[]
  className?: string
  onRefresh?: () => Promise<void> | void
}

type SortDirection = 'asc' | 'desc'
type StatusFilterKey = 'unread' | 'archive'
type PlatformFilterKey = SupportedPlatform

export function DataDisplay({ data, className, onRefresh }: DataDisplayProps) {
  const id = useId()
  const [searchQuery, setSearchQuery] = useState('')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [selectedStatuses, setSelectedStatuses] = useState<Record<StatusFilterKey, boolean>>({
    unread: true,
    archive: false,
  })
  const [selectedPlatforms, setSelectedPlatforms] = useState<Record<PlatformFilterKey, boolean>>({
    twitter: false,
    reddit: false,
    github: false,
  })
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  const [importSummary, setImportSummary] = useState<{
    imported: number
    duplicates: number
    errors: number
  } | null>(null)
  const [isImportingCsv, setIsImportingCsv] = useState(false)
  const [isAddingLink, setIsAddingLink] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [isAddingLoading, setIsAddingLoading] = useState(false)
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ mode: 'none' })
  const [onlyHomepages, setOnlyHomepages] = useState(false)
  const [validationState, setValidationState] = useState<ValidationState>({
    isRunning: false,
    progress: { checked: 0, total: 0, valid: 0, problems: 0 },
    results: new Map(),
    canCancel: false,
  })
  const [validationController, setValidationController] = useState<AbortController | null>(null)
  const [showValidationResults, setShowValidationResults] = useState(false)
  const [hideResultsTimer, setHideResultsTimer] = useState<ReturnType<typeof setTimeout> | null>(
    null
  )
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [isActionsOpen, setIsActionsOpen] = useState(false)
  const actionsMenuRef = useRef<HTMLDivElement | null>(null)
  const addLinkInputRef = useRef<HTMLInputElement | null>(null)

  const handleRequestError = (error: unknown, fallbackMessage: string) => {
    console.error(error)
    alert(error instanceof ApiError ? error.message : fallbackMessage)
  }

  const handleDeleteSelected = async () => {
    if (selectedItems.size === 0) {
      return
    }

    const confirmMessage =
      selectedItems.size === 1
        ? 'Are you sure you want to delete this item?'
        : `Are you sure you want to delete ${selectedItems.size} items?`

    if (!confirm(confirmMessage)) {
      return
    }

    try {
      await bulkDeleteItems(Array.from(selectedItems))
      setSelectedItems(new Set())
      await onRefresh?.()
    } catch (error) {
      handleRequestError(error, 'Failed to delete selected items.')
    }
  }

  const handleDeleteSingle = async (itemId: number) => {
    if (!confirm('Are you sure you want to delete this item?')) {
      return
    }

    try {
      await bulkDeleteItems([itemId])
      setSelectedItems((prev) => {
        const next = new Set(prev)
        next.delete(itemId)
        return next
      })
      await onRefresh?.()
    } catch (error) {
      handleRequestError(error, 'Failed to delete item.')
    }
  }

  const handleAddLink = async () => {
    if (!newUrl.trim()) {
      setAddError('Please enter a URL.')
      return
    }

    setIsAddingLoading(true)
    setAddError(null)

    try {
      await createItem({ url: newUrl.trim() })
      await onRefresh?.()
      setNewUrl('')
      setIsAddingLink(false)
    } catch (error) {
      setAddError(error instanceof ApiError ? error.message : 'Failed to add link.')
    } finally {
      setIsAddingLoading(false)
    }
  }

  const handleImportResult = (result: {
    imported: number
    duplicates: number
    errors: string[]
  }) => {
    setImportSummary({
      imported: result.imported,
      duplicates: result.duplicates,
      errors: result.errors.length,
    })

    if (result.imported > 0 || result.duplicates > 0) {
      setIsImportingCsv(false)
    }
  }

  const generateExportFilename = (scope: string, count: number) => {
    const timestamp = new Date().toISOString().slice(0, 10)
    return `openshelf-export-${scope}-${count}-items-${timestamp}.csv`
  }

  const handleExportAll = () => {
    exportToPocketCSV(data, generateExportFilename('all', data.length))
  }

  const getCurrentViewScope = () => {
    if (selectedStatuses.unread && !selectedStatuses.archive) {
      return 'unread'
    }

    if (selectedStatuses.archive && !selectedStatuses.unread) {
      return 'archive'
    }

    return 'filtered'
  }

  const hasAnyTags = useMemo(() => {
    return data.some((item) => item.tags && item.tags.trim() !== '')
  }, [data])

  const filteredAndSortedData = useMemo(() => {
    const filtered = data.filter((item) => {
      const normalizedSearchQuery = searchQuery.toLowerCase()
      const matchesSearch =
        searchQuery === '' ||
        item.title.toLowerCase().includes(normalizedSearchQuery) ||
        item.url.toLowerCase().includes(normalizedSearchQuery) ||
        (hasAnyTags && item.tags.toLowerCase().includes(normalizedSearchQuery))

      const matchesStatus =
        (item.status === 'unread' && selectedStatuses.unread) ||
        (item.status === 'archive' && selectedStatuses.archive)

      const platform = detectPlatformFromUrl(item.url)
      const hasSelectedPlatforms = Object.values(selectedPlatforms).some(Boolean)
      const matchesPlatform =
        !hasSelectedPlatforms || (platform !== null && selectedPlatforms[platform])

      let matchesDate = true
      if (dateFilter.mode !== 'none') {
        const itemDate = new Date(item.time_added * 1000)

        if (dateFilter.mode === 'before' && dateFilter.beforeDate) {
          const beforeDateObj = dateFilter.beforeDate.toDate
            ? dateFilter.beforeDate.toDate()
            : new Date(dateFilter.beforeDate)
          matchesDate = itemDate < beforeDateObj
        } else if (dateFilter.mode === 'after' && dateFilter.afterDate) {
          const afterDateObj = dateFilter.afterDate.toDate
            ? dateFilter.afterDate.toDate()
            : new Date(dateFilter.afterDate)
          matchesDate = itemDate > afterDateObj
        } else if (dateFilter.mode === 'between') {
          let startDateObj: Date | undefined
          let endDateObj: Date | undefined

          if (dateFilter.dateRange?.start && dateFilter.dateRange?.end) {
            startDateObj = dateFilter.dateRange.start.toDate
              ? dateFilter.dateRange.start.toDate()
              : new Date(dateFilter.dateRange.start)
            endDateObj = dateFilter.dateRange.end.toDate
              ? dateFilter.dateRange.end.toDate()
              : new Date(dateFilter.dateRange.end)
          } else if (dateFilter.startDate && dateFilter.endDate) {
            startDateObj = dateFilter.startDate.toDate
              ? dateFilter.startDate.toDate()
              : new Date(dateFilter.startDate)
            endDateObj = dateFilter.endDate.toDate
              ? dateFilter.endDate.toDate()
              : new Date(dateFilter.endDate)
          }

          if (startDateObj && endDateObj) {
            matchesDate = itemDate >= startDateObj && itemDate <= endDateObj
          }
        }
      }

      const matchesHomepage = !onlyHomepages || isHomepage(item.url)

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPlatform &&
        matchesDate &&
        matchesHomepage
      )
    })

    filtered.sort((a, b) => {
      return sortDirection === 'desc'
        ? b.time_added - a.time_added
        : a.time_added - b.time_added
    })

    return filtered
  }, [
    data,
    dateFilter,
    hasAnyTags,
    onlyHomepages,
    searchQuery,
    selectedPlatforms,
    selectedStatuses,
    sortDirection,
  ])

  const unreadFilteredData = useMemo(() => {
    return filteredAndSortedData.filter((item) => item.status === 'unread')
  }, [filteredAndSortedData])

  const handleExportFiltered = () => {
    const scope = getCurrentViewScope()
    exportToPocketCSV(
      filteredAndSortedData,
      generateExportFilename(scope, filteredAndSortedData.length)
    )
  }

  const handleExportSelected = () => {
    const selectedData = data.filter((item) => selectedItems.has(item.id))
    exportToPocketCSV(
      selectedData,
      generateExportFilename('selected', selectedData.length)
    )
  }

  const handleClearArchived = async () => {
    const archivedCount = data.filter((item) => item.status === 'archive').length
    if (archivedCount === 0) {
      return
    }

    const confirmMessage = `Are you sure you want to permanently delete all ${archivedCount} archived items?`
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      await clearArchivedItems()
      setSelectedItems(new Set())
      await onRefresh?.()
    } catch (error) {
      handleRequestError(error, 'Failed to clear archived items.')
    }
  }

  const handleStartValidation = async () => {
    if (unreadFilteredData.length === 0) {
      return
    }

    const confirmMessage = `Check ${unreadFilteredData.length} unread URLs? This may take a few minutes.`
    if (!confirm(confirmMessage)) {
      return
    }

    const controller = new AbortController()
    setValidationController(controller)
    setValidationState({
      isRunning: true,
      progress: {
        checked: 0,
        total: unreadFilteredData.length,
        valid: 0,
        problems: 0,
      },
      results: new Map(),
      canCancel: true,
    })

    try {
      const results = await validateUrls(
        unreadFilteredData,
        (progress: ValidationProgress) => {
          setValidationState((prev) => ({
            ...prev,
            progress,
          }))
        },
        controller.signal
      )

      const updates = data
        .map((item) => {
          const result = results.get(item.url)
          if (!result) {
            return null
          }

          return patchItem(item.id, {
            validation_status: result.status,
            validation_checked_at: Date.now(),
          })
        })
        .filter((update): update is Promise<PocketItem> => update !== null)

      await Promise.all(updates)
      await onRefresh?.()

      setValidationState((prev) => ({
        ...prev,
        isRunning: false,
        results,
        canCancel: false,
      }))

      setShowValidationResults(true)
      const timer = setTimeout(() => {
        setShowValidationResults(false)
      }, 3000)
      setHideResultsTimer(timer)
    } catch (error) {
      console.error('Validation error:', error)
      setValidationState((prev) => ({
        ...prev,
        isRunning: false,
        canCancel: false,
      }))
    }

    setValidationController(null)
  }

  const handleCancelValidation = () => {
    if (validationController) {
      validationController.abort()
      setValidationController(null)
    }

    setValidationState((prev) => ({
      ...prev,
      isRunning: false,
      canCancel: false,
    }))
    setShowValidationResults(false)

    if (hideResultsTimer) {
      clearTimeout(hideResultsTimer)
      setHideResultsTimer(null)
    }
  }

  const unreadCount = useMemo(() => {
    return data.filter((item) => item.status === 'unread').length
  }, [data])

  const archivedCount = useMemo(() => {
    return data.filter((item) => item.status === 'archive').length
  }, [data])

  const activeFilterCount = [
    dateFilter.mode !== 'none',
    onlyHomepages,
    Object.values(selectedPlatforms).some(Boolean),
  ].filter(Boolean).length
  const hasActiveFilters = activeFilterCount > 0
  const hasSelectedStatuses = selectedStatuses.unread || selectedStatuses.archive
  const hasScopedView =
    hasActiveFilters || !selectedStatuses.unread || !selectedStatuses.archive

  const toggleStatusFilter = (status: StatusFilterKey) => {
    setSelectedStatuses((prev) => ({
      ...prev,
      [status]: !prev[status],
    }))
  }

  const togglePlatformFilter = (platform: PlatformFilterKey) => {
    setSelectedPlatforms((prev) => ({
      ...prev,
      [platform]: !prev[platform],
    }))
  }

  React.useEffect(() => {
    if (!isActionsOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setIsActionsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsActionsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isActionsOpen])

  React.useEffect(() => {
    if (!isAddingLink) {
      return
    }

    addLinkInputRef.current?.focus()
    addLinkInputRef.current?.select()
  }, [isAddingLink])

  const totalItems = filteredAndSortedData.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = filteredAndSortedData.slice(startIndex, endIndex)

  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedStatuses, selectedPlatforms, itemsPerPage, dateFilter, onlyHomepages])

  React.useEffect(() => {
    return () => {
      if (hideResultsTimer) {
        clearTimeout(hideResultsTimer)
      }
    }
  }, [hideResultsTimer])

  const { pages, showLeftEllipsis, showRightEllipsis } = usePagination({
    currentPage,
    totalPages,
    paginationItemsToDisplay: 5,
  })

  const handleResetFilters = () => {
    setSearchQuery('')
    setDateFilter({ mode: 'none' })
    setOnlyHomepages(false)
    setSelectedPlatforms({
      twitter: false,
      reddit: false,
      github: false,
    })
  }

  const handleTogglePageSelection = (checked: boolean) => {
    setSelectedItems((prev) => {
      const next = new Set(prev)
      paginatedData.forEach((item) => {
        if (checked) {
          next.add(item.id)
        } else {
          next.delete(item.id)
        }
      })
      return next
    })
  }

  const handleToggleItemSelection = (itemId: number, checked: boolean) => {
    setSelectedItems((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(itemId)
      } else {
        next.delete(itemId)
      }
      return next
    })
  }

  const handleToggleImportCsv = () => {
    setIsImportingCsv((prev) => !prev)
    setImportSummary(null)
    setIsActionsOpen(false)
  }

  const handleToggleAddLink = () => {
    setIsAddingLink((prev) => !prev)
    setAddError(null)
  }

  const handleCancelAddLink = () => {
    setIsAddingLink(false)
    setNewUrl('')
    setAddError(null)
  }

  const handleNewUrlChange = (value: string) => {
    setNewUrl(value)
    if (addError) {
      setAddError(null)
    }
  }

  const headerActionsTarget =
    typeof document !== 'undefined'
      ? document.getElementById('openshelf-header-actions')
      : null
  const headerStatusFiltersTarget =
    typeof document !== 'undefined'
      ? document.getElementById('openshelf-header-status-filters')
      : null
  const headerPanelsTarget =
    typeof document !== 'undefined'
      ? document.getElementById('openshelf-header-panels')
      : null

  return (
    <div className={className}>
      {headerStatusFiltersTarget &&
        createPortal(
          <DataDisplayHeaderStatusFilters
            selectedStatuses={selectedStatuses}
            unreadCount={unreadCount}
            archivedCount={archivedCount}
            onToggleStatusFilter={toggleStatusFilter}
          />,
          headerStatusFiltersTarget
        )}

      {headerActionsTarget &&
        createPortal(
          <DataDisplayHeaderActions
            actionsMenuRef={actionsMenuRef}
            isActionsOpen={isActionsOpen}
            hasScopedView={hasScopedView}
            unreadFilteredCount={unreadFilteredData.length}
            archivedCount={archivedCount}
            isValidationRunning={validationState.isRunning}
            onToggleActionsOpen={() => setIsActionsOpen((prev) => !prev)}
            onExportAll={() => {
              handleExportAll()
              setIsActionsOpen(false)
            }}
            onExportFiltered={() => {
              handleExportFiltered()
              setIsActionsOpen(false)
            }}
            onToggleImportCsv={handleToggleImportCsv}
            onStartValidation={() => {
              void handleStartValidation()
              setIsActionsOpen(false)
            }}
            onCancelValidation={() => {
              handleCancelValidation()
              setIsActionsOpen(false)
            }}
            onClearArchived={() => {
              void handleClearArchived()
              setIsActionsOpen(false)
            }}
            onToggleAddLink={handleToggleAddLink}
          />,
          headerActionsTarget
        )}

      {headerPanelsTarget &&
        createPortal(
          <DataDisplayHeaderPanels
            id={id}
            isImportingCsv={isImportingCsv}
            isAddingLink={isAddingLink}
            newUrl={newUrl}
            addError={addError}
            isAddingLoading={isAddingLoading}
            addLinkInputRef={addLinkInputRef}
            onRefresh={onRefresh}
            onImportResult={handleImportResult}
            onNewUrlChange={handleNewUrlChange}
            onSubmitAddLink={() => {
              void handleAddLink()
            }}
            onCancelAddLink={handleCancelAddLink}
          />,
          headerPanelsTarget
        )}

      {importSummary && (
        <DataDisplayImportSummary
          importSummary={importSummary}
          onDismiss={() => setImportSummary(null)}
        />
      )}

      <DataDisplayFilters
        id={id}
        searchQuery={searchQuery}
        hasAnyTags={hasAnyTags}
        activeFilterCount={activeFilterCount}
        isFiltersOpen={isFiltersOpen}
        hasActiveFilters={hasActiveFilters}
        onlyHomepages={onlyHomepages}
        selectedPlatforms={selectedPlatforms}
        dateFilter={dateFilter}
        onToggleFiltersOpen={() => setIsFiltersOpen((prev) => !prev)}
        onSearchQueryChange={setSearchQuery}
        onResetFilters={handleResetFilters}
        onOnlyHomepagesChange={setOnlyHomepages}
        onTogglePlatformFilter={togglePlatformFilter}
        onDateFilterChange={setDateFilter}
      />

      <DataDisplayValidationStatus
        validationState={validationState}
        showValidationResults={showValidationResults}
        onCancelValidation={handleCancelValidation}
      />

      <DataDisplayListControls
        sortDirection={sortDirection}
        itemsPerPage={itemsPerPage}
        onToggleSortDirection={() =>
          setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'))
        }
        onItemsPerPageChange={setItemsPerPage}
      />

      <DataDisplayBulkActions
        selectedCount={selectedItems.size}
        onExportSelected={handleExportSelected}
        onClearSelection={() => setSelectedItems(new Set())}
        onDeleteSelected={() => {
          void handleDeleteSelected()
        }}
      />

      <DataDisplayTable
        id={id}
        filteredAndSortedData={filteredAndSortedData}
        paginatedData={paginatedData}
        selectedItems={selectedItems}
        hasAnyTags={hasAnyTags}
        searchQuery={searchQuery}
        hasSelectedStatuses={hasSelectedStatuses}
        dateFilter={dateFilter}
        onlyHomepages={onlyHomepages}
        selectedPlatforms={selectedPlatforms}
        onTogglePageSelection={handleTogglePageSelection}
        onToggleItemSelection={handleToggleItemSelection}
        onDeleteSingle={(itemId) => {
          void handleDeleteSingle(itemId)
        }}
      />

      <DataDisplayPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        startIndex={startIndex}
        endIndex={endIndex}
        pages={pages}
        showLeftEllipsis={showLeftEllipsis}
        showRightEllipsis={showRightEllipsis}
        onPageChange={setCurrentPage}
      />
    </div>
  )
}