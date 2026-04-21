import React, { useState, useMemo, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ExternalLink, Search, SortAsc, SortDesc, HelpCircle, CheckCircle, X, Trash2, Download, Sparkles, AlertTriangle, Plus, Upload, ChevronDown, ChevronUp, SlidersHorizontal, Twitter, Github } from 'lucide-react'
import { Button } from './ui/button'
import { Checkbox } from './ui/checkbox'
import { Label } from './ui/label'
import { Switch } from './ui/switch'
import { Tooltip } from './ui/tooltip'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from './ui/pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table'
import { usePagination } from '../hooks/use-pagination'
import { PocketItem } from '../types/pocket'
import { detectPlatformFromUrl, PLATFORM_OPTIONS, type SupportedPlatform } from '../lib/platforms'
import { formatDate, formatDateTime, cn } from '../lib/utils'
import { exportToPocketCSV } from '../utils/csvParser'
import { ApiError, bulkDeleteItems, clearArchivedItems, createItem, patchItem } from '../lib/api'
import { FileUpload } from './FileUpload'
import { DateRangeFilter, type DateFilterValue } from './ui/date-range-filter'
import {
  validateUrls,
  ValidationState,
  ValidationProgress,
} from '../utils/urlValidator'


interface DataDisplayProps {
  data: PocketItem[]
  className?: string
  onRefresh?: () => Promise<void> | void
}

type SortDirection = 'asc' | 'desc'
type StatusFilterKey = 'unread' | 'archive'
type PlatformFilterKey = SupportedPlatform

function RedditIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(className, 'size-4')}
      aria-hidden="true"
    >
      <circle cx="12" cy="13.25" r="6.25" />
      <circle cx="9.4" cy="12.4" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="14.6" cy="12.4" r="1.05" fill="currentColor" stroke="none" />
      <path d="M9.6 15.55c.8.78 1.82 1.2 2.4 1.2.58 0 1.6-.42 2.4-1.2" />
      <path d="M13.9 7.35 15.3 4.55l2.75.6" />
      <circle cx="18.55" cy="5.55" r="1.45" />
      <path d="M17.55 9.5c.72.28 1.34.78 1.78 1.43" />
      <path d="M4.8 10.95c.45-.76 1.1-1.35 1.87-1.67" />
    </svg>
  )
}

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
  
  // Date filtering state
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ mode: 'none' })
  
  // Homepage filter state
  const [onlyHomepages, setOnlyHomepages] = useState(false)

  // URL validation state
  const [validationState, setValidationState] = useState<ValidationState>({
    isRunning: false,
    progress: { checked: 0, total: 0, valid: 0, problems: 0 },
    results: new Map(),
    canCancel: false
  })
  const [validationController, setValidationController] = useState<AbortController | null>(null)
  const [showValidationResults, setShowValidationResults] = useState(false)
  const [hideResultsTimer, setHideResultsTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [isActionsOpen, setIsActionsOpen] = useState(false)
  const actionsMenuRef = useRef<HTMLDivElement | null>(null)
  const addLinkInputRef = useRef<HTMLInputElement | null>(null)

  // Homepage detection function
  const isHomepage = (url: string) => {
    try {
      const urlObj = new URL(url)
      
      // Check if path is just "/" or empty, and no hash
      const isRootPath = urlObj.pathname === '/' || urlObj.pathname === ''
      const hasNoHash = urlObj.hash === ''
      
      if (!isRootPath || !hasNoHash) {
        return false
      }
      
      // Check query parameters - only allow tracking/referral parameters
      const allowedParamPrefixes = [
        'utm_',     // UTM tracking (utm_source, utm_medium, utm_campaign, etc.)
        'ref',      // Referral tracking
        'fbclid',   // Facebook click ID
        'gclid',    // Google click ID
        'msclkid',  // Microsoft click ID
        'twclid',   // Twitter click ID
        'igshid',   // Instagram share ID
        'source',   // Generic source tracking
        'from',     // Generic from tracking
        'campaign', // Campaign tracking
        'medium'    // Medium tracking
      ]
      
      const searchParams = new URLSearchParams(urlObj.search)
      for (const [paramName] of searchParams) {
        const isAllowed = allowedParamPrefixes.some(prefix => 
          paramName.toLowerCase().startsWith(prefix.toLowerCase()) || 
          paramName.toLowerCase() === prefix.toLowerCase()
        )
        if (!isAllowed) {
          return false
        }
      }
      
      return true
    } catch {
      return false
    }
  }

  const handleRequestError = (error: unknown, fallbackMessage: string) => {
    console.error(error)
    alert(error instanceof ApiError ? error.message : fallbackMessage)
  }

  // Delete handlers
  const handleDeleteSelected = async () => {
    if (selectedItems.size === 0) return

    const confirmMessage = selectedItems.size === 1
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
      setSelectedItems(prev => {
        const newSelected = new Set(prev)
        newSelected.delete(itemId)
        return newSelected
      })
      await onRefresh?.()
    } catch (error) {
      handleRequestError(error, 'Failed to delete item.')
    }
  }

  // Add single link handler
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

  const handleImportResult = (result: { imported: number; duplicates: number; errors: string[] }) => {
    setImportSummary({
      imported: result.imported,
      duplicates: result.duplicates,
      errors: result.errors.length,
    })

    if (result.imported > 0 || result.duplicates > 0) {
      setIsImportingCsv(false)
    }
  }

  // Export handlers
  const generateExportFilename = (scope: string, count: number) => {
    const timestamp = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    return `openshelf-export-${scope}-${count}-items-${timestamp}.csv`
  }

  const handleExportAll = () => {
    const filename = generateExportFilename('all', data.length)
    exportToPocketCSV(data, filename)
  }

  const handleExportFiltered = () => {
    const scope = getCurrentViewScope()
    const filename = generateExportFilename(scope, filteredAndSortedData.length)
    exportToPocketCSV(filteredAndSortedData, filename)
  }

  const handleExportSelected = () => {
    const selectedData = data.filter(item => selectedItems.has(item.id))
    const filename = generateExportFilename('selected', selectedData.length)
    exportToPocketCSV(selectedData, filename)
  }

  // Clear archived handler
  const handleClearArchived = async () => {
    const archivedCount = data.filter(item => item.status === 'archive').length
    if (archivedCount === 0) return
    
    const confirmMessage = `Are you sure you want to permanently delete all ${archivedCount} archived items?`
    
    if (confirm(confirmMessage)) {
      try {
        await clearArchivedItems()
        setSelectedItems(new Set())
        await onRefresh?.()
      } catch (error) {
        handleRequestError(error, 'Failed to clear archived items.')
      }
    }
  }

  // URL validation handlers
  const handleStartValidation = async () => {
    if (unreadFilteredData.length === 0) return

    const confirmMessage = `Check ${unreadFilteredData.length} unread URLs? This may take a few minutes.`
    if (!confirm(confirmMessage)) return

    const controller = new AbortController()
    setValidationController(controller)
    
    setValidationState({
      isRunning: true,
      progress: { checked: 0, total: unreadFilteredData.length, valid: 0, problems: 0 },
      results: new Map(),
      canCancel: true
    })

    try {
      const results = await validateUrls(
        unreadFilteredData, 
        (progress: ValidationProgress) => {
          setValidationState(prev => ({
            ...prev,
            progress
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
            validation_checked_at: Date.now()
          })
        })
        .filter((update): update is Promise<PocketItem> => update !== null)

      await Promise.all(updates)
      await onRefresh?.()

      setValidationState(prev => ({
        ...prev,
        isRunning: false,
        results,
        canCancel: false
      }))

      // Show results and auto-hide after 3 seconds
      setShowValidationResults(true)
      const timer = setTimeout(() => {
        setShowValidationResults(false)
      }, 3000)
      setHideResultsTimer(timer)

    } catch (error) {
      console.error('Validation error:', error)
      setValidationState(prev => ({
        ...prev,
        isRunning: false,
        canCancel: false
      }))
    }

    setValidationController(null)
  }

  const handleCancelValidation = () => {
    if (validationController) {
      validationController.abort()
      setValidationController(null)
    }
    setValidationState(prev => ({
      ...prev,
      isRunning: false,
      canCancel: false
    }))
    setShowValidationResults(false)
    if (hideResultsTimer) {
      clearTimeout(hideResultsTimer)
      setHideResultsTimer(null)
    }
  }

  // Check if any items have tags
  const hasAnyTags = useMemo(() => {
    return data.some(item => item.tags && item.tags.trim() !== '')
  }, [data])

  const unreadCount = useMemo(() => {
    return data.filter(item => item.status === 'unread').length
  }, [data])

  const archivedCount = useMemo(() => {
    return data.filter(item => item.status === 'archive').length
  }, [data])

  const activeFilterCount = [
    dateFilter.mode !== 'none',
    onlyHomepages,
    Object.values(selectedPlatforms).some(Boolean),
  ].filter(Boolean).length

  const hasActiveFilters = activeFilterCount > 0
  const hasSelectedStatuses = selectedStatuses.unread || selectedStatuses.archive
  const hasScopedView = hasActiveFilters || !selectedStatuses.unread || !selectedStatuses.archive

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

  const getCurrentViewScope = () => {
    if (selectedStatuses.unread && !selectedStatuses.archive) {
      return 'unread'
    }

    if (selectedStatuses.archive && !selectedStatuses.unread) {
      return 'archive'
    }

    return 'filtered'
  }

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = data.filter(item => {
      // Search filter
      const matchesSearch = searchQuery === '' || 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.url.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (hasAnyTags && item.tags.toLowerCase().includes(searchQuery.toLowerCase()))
      
      // Status filter
      const matchesStatus =
        (item.status === 'unread' && selectedStatuses.unread) ||
        (item.status === 'archive' && selectedStatuses.archive)

      const platform = detectPlatformFromUrl(item.url)
      const hasSelectedPlatforms = Object.values(selectedPlatforms).some(Boolean)
      const matchesPlatform = !hasSelectedPlatforms || (platform !== null && selectedPlatforms[platform])
      
      // Date filter
      let matchesDate = true
      if (dateFilter.mode !== 'none') {
        const itemDate = new Date(item.time_added * 1000) // Convert Unix timestamp to Date
        
        if (dateFilter.mode === 'before' && dateFilter.beforeDate) {
          // Convert React Aria date to JS Date if needed
          const beforeDateObj = dateFilter.beforeDate.toDate ? dateFilter.beforeDate.toDate() : new Date(dateFilter.beforeDate)
          matchesDate = itemDate < beforeDateObj
        } else if (dateFilter.mode === 'after' && dateFilter.afterDate) {
          const afterDateObj = dateFilter.afterDate.toDate ? dateFilter.afterDate.toDate() : new Date(dateFilter.afterDate)
          matchesDate = itemDate > afterDateObj
        } else if (dateFilter.mode === 'between') {
          // Handle new DateRangePicker format (dateRange.start/end) or legacy format (startDate/endDate)
          let startDateObj, endDateObj
          
          if (dateFilter.dateRange?.start && dateFilter.dateRange?.end) {
            // New DateRangePicker format
            startDateObj = dateFilter.dateRange.start.toDate ? dateFilter.dateRange.start.toDate() : new Date(dateFilter.dateRange.start)
            endDateObj = dateFilter.dateRange.end.toDate ? dateFilter.dateRange.end.toDate() : new Date(dateFilter.dateRange.end)
          } else if (dateFilter.startDate && dateFilter.endDate) {
            // Legacy format
            startDateObj = dateFilter.startDate.toDate ? dateFilter.startDate.toDate() : new Date(dateFilter.startDate)
            endDateObj = dateFilter.endDate.toDate ? dateFilter.endDate.toDate() : new Date(dateFilter.endDate)
          }
          
          if (startDateObj && endDateObj) {
            matchesDate = itemDate >= startDateObj && itemDate <= endDateObj
          }
        }
      }
      
      // Homepage filter
      const matchesHomepage = !onlyHomepages || isHomepage(item.url)
      
      return matchesSearch && matchesStatus && matchesPlatform && matchesDate && matchesHomepage
    })

    // Sort by date
    filtered.sort((a, b) => {
      const dateA = a.time_added
      const dateB = b.time_added
      return sortDirection === 'desc' ? dateB - dateA : dateA - dateB
    })

    return filtered
  }, [data, searchQuery, selectedStatuses, selectedPlatforms, sortDirection, hasAnyTags, dateFilter, onlyHomepages])

  // Calculate unread filtered items for validation
  const unreadFilteredData = useMemo(() => {
    return filteredAndSortedData.filter(item => item.status === 'unread')
  }, [filteredAndSortedData])

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

  // Calculate pagination
  const totalItems = filteredAndSortedData.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedData = filteredAndSortedData.slice(startIndex, endIndex)

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedStatuses, selectedPlatforms, itemsPerPage, dateFilter, onlyHomepages])

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => {
      if (hideResultsTimer) {
        clearTimeout(hideResultsTimer)
      }
    }
  }, [hideResultsTimer])

  // Use pagination hook
  const { pages, showLeftEllipsis, showRightEllipsis } = usePagination({
    currentPage,
    totalPages,
    paginationItemsToDisplay: 5,
  })

  const getStatusBadge = (status: PocketItem['status']) => {
    const styles = {
      unread: "bg-amber-400/20 text-amber-600",
      archive: "bg-blue-400/20 text-blue-600",
    }[status]

    const letter = status === 'unread' ? 'U' : 'A'

    return (
      <div
        className={cn(
          "flex size-5 items-center justify-center rounded text-xs font-medium",
          styles
        )}
      >
        {letter}
      </div>
    )
  }

  const getValidationBadge = (validationStatus?: PocketItem['validation_status']) => {
    if (!validationStatus || validationStatus === 'valid' || validationStatus === 'pending' || validationStatus === 'checking') {
      return null
    }

    if (validationStatus === 'problem') {
      return (
        <div
          className={cn(
            "flex size-5 items-center justify-center rounded text-xs font-medium",
            "bg-red-400/20 text-red-600"
          )}
          title="X - problem resolving"
        >
          X
        </div>
      )
    }

    return null
  }

  const getPlatformIcon = (platform: SupportedPlatform | null) => {
    switch (platform) {
      case 'twitter':
        return <Twitter className="size-3.5 flex-shrink-0 text-current" aria-hidden="true" />
      case 'reddit':
        return <RedditIcon className="size-3.5 flex-shrink-0 text-current" />
      case 'github':
        return <Github className="size-3.5 flex-shrink-0 text-current" aria-hidden="true" />
      default:
        return <ExternalLink className="size-3.5 flex-shrink-0 text-current" aria-hidden="true" />
    }
  }

  const getPlatformBadge = (platform: SupportedPlatform | null) => {
    if (!platform) {
      return null
    }

    const platformLabel = PLATFORM_OPTIONS.find((option) => option.key === platform)?.label ?? 'Platform'

    return (
      <div
        className="flex size-5 items-center justify-center rounded text-muted-foreground"
        title={platformLabel}
      >
        {getPlatformIcon(platform)}
      </div>
    )
  }

  // Removed favicon fetching - too many requests for large lists
  // Removed URL truncation - users want to see full URLs

  const headerActionsTarget = typeof document !== 'undefined'
    ? document.getElementById('openshelf-header-actions')
    : null
  const headerStatusFiltersTarget = typeof document !== 'undefined'
    ? document.getElementById('openshelf-header-status-filters')
    : null
  const headerPanelsTarget = typeof document !== 'undefined'
    ? document.getElementById('openshelf-header-panels')
    : null

  return (
    <div className={className}>
      {headerStatusFiltersTarget && createPortal(
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
                onChange={() => toggleStatusFilter(option.key)}
                aria-label={`${option.label} (${option.count})`}
                className="size-4 accent-slate-900"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>,
        headerStatusFiltersTarget
      )}

      {headerActionsTarget && createPortal(
        <>
          <div className="relative" ref={actionsMenuRef}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsActionsOpen((prev) => !prev)}
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
                  onClick={() => {
                    handleExportAll()
                    setIsActionsOpen(false)
                  }}
                  className="w-full justify-start gap-2"
                >
                  <Download className="size-4 opacity-60" aria-hidden="true" />
                  Export all
                </Button>
                {hasScopedView && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      handleExportFiltered()
                      setIsActionsOpen(false)
                    }}
                    className="w-full justify-start gap-2"
                  >
                    <Download className="size-4 opacity-60" aria-hidden="true" />
                    Export current view
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsImportingCsv((prev) => !prev)
                    setImportSummary(null)
                    setIsActionsOpen(false)
                  }}
                  className="w-full justify-start gap-2"
                >
                  <Upload className="size-4 opacity-60" aria-hidden="true" />
                  Import CSV
                </Button>
                {!validationState.isRunning ? (
                  <Tooltip content="Checks only links from unread items in the current view">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        void handleStartValidation()
                        setIsActionsOpen(false)
                      }}
                      disabled={unreadFilteredData.length === 0}
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
                    onClick={() => {
                      handleCancelValidation()
                      setIsActionsOpen(false)
                    }}
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
                    onClick={() => {
                      void handleClearArchived()
                      setIsActionsOpen(false)
                    }}
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
            onClick={() => {
              setIsAddingLink(prev => !prev)
              setAddError(null)
            }}
            className="gap-2 border border-amber-200 bg-amber-100 text-amber-900 hover:bg-amber-200"
          >
            <Plus className="opacity-60" size={16} aria-hidden="true" />
            Add link
          </Button>
        </>,
        headerActionsTarget
      )}

      {headerPanelsTarget && createPortal(
        <div className="space-y-3">
          {isImportingCsv && (
            <FileUpload
              className="w-full"
              onImportComplete={async () => {
                await onRefresh?.()
              }}
              onImportResult={handleImportResult}
            />
          )}

          {isAddingLink && (
            <div className="w-full space-y-2 rounded-md border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <form
                className="flex flex-col gap-2 sm:flex-row"
                onSubmit={(event) => {
                  event.preventDefault()
                  void handleAddLink()
                }}
              >
                <input
                  ref={addLinkInputRef}
                  id={`${id}-new-url`}
                  type="url"
                  placeholder="https://example.com/article"
                  value={newUrl}
                  onChange={(e) => {
                    setNewUrl(e.target.value)
                    if (addError) setAddError(null)
                  }}
                  className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    type="submit"
                    disabled={isAddingLoading}
                    className="sm:w-auto"
                  >
                    {isAddingLoading ? 'Adding…' : 'Add'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => {
                      setIsAddingLink(false)
                      setNewUrl('')
                      setAddError(null)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
              {addError && (
                <div className="flex items-center gap-1 text-xs text-destructive">
                  <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                  <span>{addError}</span>
                </div>
              )}
            </div>
          )}
        </div>,
        headerPanelsTarget
      )}

      {/* Import Success Notification */}
      {importSummary && (
        <div 
          className="mb-8 w-full rounded-md border border-green-200 bg-green-50 px-4 py-3 shadow-sm"
          style={{
            animation: 'slideInFromTop 0.5s ease-out'
          }}
        >
          <div className="flex gap-2">
            <div className="grow">
              <div className="flex items-center text-sm font-medium text-green-800">
                <CheckCircle
                  className="me-3 -mt-0.5 inline-flex text-green-600"
                  size={16}
                  aria-hidden="true"
                />
                CSV import finished.
              </div>
              <div className="mt-1 text-xs text-green-700 ml-7">
                Added {importSummary.imported} new item{importSummary.imported !== 1 ? 's' : ''} • skipped {importSummary.duplicates} duplicate{importSummary.duplicates !== 1 ? 's' : ''}
                {importSummary.errors > 0 ? ` • ${importSummary.errors} row error${importSummary.errors !== 1 ? 's' : ''} reported` : ''}
              </div>
            </div>
            <Button
              variant="ghost"
              className="group -my-1.5 -me-2 size-8 shrink-0 p-0 hover:bg-green-100"
              aria-label="Close notification"
              onClick={() => setImportSummary(null)}
            >
              <X
                size={16}
                className="opacity-60 transition-opacity group-hover:opacity-100 text-green-600"
                aria-hidden="true"
              />
            </Button>
          </div>
        </div>
              )}

      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFiltersOpen((prev) => !prev)}
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
              placeholder={hasAnyTags ? "Search titles, URLs, or tags..." : "Search titles and URLs..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </div>

        {isFiltersOpen && (
          <div className="mt-3 rounded-lg border bg-card p-4">
            {hasActiveFilters && (
              <div className="mb-4 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('')
                    setDateFilter({ mode: 'none' })
                    setOnlyHomepages(false)
                    setSelectedPlatforms({
                      twitter: false,
                      reddit: false,
                      github: false,
                    })
                  }}
                >
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
                    onCheckedChange={setOnlyHomepages}
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
                          onClick={() => togglePlatformFilter(platform.key)}
                          className={cn(
                            'gap-2',
                            isSelected && 'border-slate-900 bg-slate-900 text-slate-50 hover:bg-slate-800 hover:text-slate-50'
                          )}
                          aria-pressed={isSelected}
                        >
                          {getPlatformIcon(platform.key)}
                          {platform.label}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              </fieldset>

              <DateRangeFilter
                value={dateFilter}
                onChange={setDateFilter}
              />
            </div>
          </div>
        )}
      </div>

      {validationState.isRunning && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3">
          <div className="text-sm text-muted-foreground">
            Checking URLs... {validationState.progress.checked}/{validationState.progress.total} ({Math.round((validationState.progress.checked / validationState.progress.total) * 100)}%)
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancelValidation}
          >
            Stop
          </Button>
        </div>
      )}

      {!validationState.isRunning && validationState.results.size > 0 && showValidationResults && (
        <div className="mb-6 rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Checked {validationState.progress.checked} URLs in the current unread view.
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg bg-muted/30 p-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Sort:</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSortDirection(sortDirection === 'desc' ? 'asc' : 'desc')}
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
                variant={itemsPerPage === size ? "default" : "outline"}
                size="sm"
                onClick={() => setItemsPerPage(size)}
                className="h-8 px-2 text-xs"
              >
                {size}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedItems.size > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-blue-50 border border-blue-200 p-4">
          <div className="flex items-center gap-2 text-sm text-blue-800">
            <span className="font-medium">
              {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              onClick={handleExportSelected}
              className="gap-2"
            >
              <Download className="opacity-60" size={16} aria-hidden="true" />
              Export selected
            </Button>
            <Button
              variant="secondary"
              onClick={() => setSelectedItems(new Set())}
            >
              Clear selection
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSelected}
              className="gap-2"
            >
              <Trash2 className="opacity-60" size={16} aria-hidden="true" />
              Delete selected
            </Button>
          </div>
        </div>
      )}

      {/* Data Table */}
      {filteredAndSortedData.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            {searchQuery || !hasSelectedStatuses || dateFilter.mode !== 'none' || onlyHomepages || Object.values(selectedPlatforms).some(Boolean)
              ? 'No items match your filters.' 
              : 'No items to display.'}
          </div>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[80px]">
                <Checkbox 
                  id={id}
                  checked={paginatedData.length > 0 && paginatedData.every(item => selectedItems.has(item.id))}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const newSelected = new Set(selectedItems)
                      paginatedData.forEach(item => newSelected.add(item.id))
                      setSelectedItems(newSelected)
                    } else {
                      const newSelected = new Set(selectedItems)
                      paginatedData.forEach(item => newSelected.delete(item.id))
                      setSelectedItems(newSelected)
                    }
                  }}
                />
              </TableHead>
              <TableHead className="w-[40%]">Title</TableHead>
              <TableHead className="w-[40%]">URL</TableHead>
              <TableHead className="w-[12%]">Date Added</TableHead>
              <TableHead className="text-center">
                <Tooltip content="Platform icon, U - unread, A - archived, X - problem resolving">
                  <div className="flex items-center gap-1 justify-center">
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
                  data-state={selectedItems.has(item.id) ? "selected" : undefined}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`table-checkbox-${index}`}
                        checked={selectedItems.has(item.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedItems)
                          if (e.target.checked) {
                            newSelected.add(item.id)
                          } else {
                            newSelected.delete(item.id)
                          }
                          setSelectedItems(newSelected)
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleDeleteSingle(item.id)}
                        className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary transition-colors flex items-center gap-2"
                    >
                      <ExternalLink className="size-3.5 flex-shrink-0 text-current" aria-hidden="true" />
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
                    <div className="flex justify-center items-center gap-1">
                      {getPlatformBadge(platform)}
                      {getStatusBadge(item.status)}
                      {getValidationBadge(item.validation_status)}
                    </div>
                  </TableCell>
                  {hasAnyTags && (
                    <TableCell>
                      {item.tags && item.tags.trim() !== '' && (
                        <span className="text-xs text-muted-foreground break-words">
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
      )}

      {/* Pagination Navigation */}
      {totalPages > 1 && (
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1}-{Math.min(endIndex, totalItems)} of {totalItems} items
          </div>
          <div className="flex justify-center sm:justify-end">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
                    href={currentPage === 1 ? undefined : `#/page/${currentPage - 1}`}
                    onClick={currentPage === 1 ? undefined : () => setCurrentPage(Math.max(1, currentPage - 1))}
                    aria-disabled={currentPage === 1 ? true : undefined}
                    role={currentPage === 1 ? "link" : undefined}
                  />
                </PaginationItem>

                {showLeftEllipsis && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}

                {pages.map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      href={`#/page/${page}`}
                      onClick={() => setCurrentPage(page)}
                      isActive={page === currentPage}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                {showRightEllipsis && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}

                <PaginationItem>
                  <PaginationNext
                    className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
                    href={currentPage === totalPages ? undefined : `#/page/${currentPage + 1}`}
                    onClick={currentPage === totalPages ? undefined : () => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    aria-disabled={currentPage === totalPages ? true : undefined}
                    role={currentPage === totalPages ? "link" : undefined}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      )}
    </div>
  )
} 