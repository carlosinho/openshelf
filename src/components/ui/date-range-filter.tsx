"use client"

import React from "react"
import { cn } from "../../lib/utils"
import { DatePicker } from "./date-picker"

export type DateFilterMode = 'none' | 'before' | 'after' | 'between'

export interface DateFilterValue {
  mode: DateFilterMode
  beforeDate?: any
  afterDate?: any
  startDate?: any
  endDate?: any
  dateRange?: any // For the new DateRangePicker
}

interface DateRangeFilterProps {
  value: DateFilterValue
  onChange: (value: DateFilterValue) => void
  className?: string
}

const MODE_OPTIONS: { value: DateFilterMode; label: string }[] = [
  { value: 'none', label: 'No date filter' },
  { value: 'before', label: 'Added before' },
  { value: 'after', label: 'Added after' },
  { value: 'between', label: 'Added between' },
]

export function DateRangeFilter({ value, onChange, className }: DateRangeFilterProps) {
  const handleModeChange = (mode: DateFilterMode) => {
    onChange({
      mode,
      beforeDate: mode === 'before' ? value.beforeDate : undefined,
      afterDate: mode === 'after' ? value.afterDate : undefined,
      startDate: mode === 'between' ? value.startDate : undefined,
      endDate: mode === 'between' ? value.endDate : undefined,
      dateRange: mode === 'between' ? value.dateRange : undefined,
    })
  }

  const renderModeContent = (mode: DateFilterMode) => {
    if (mode === 'none') {
      return (
        <p className="text-muted-foreground text-sm">No date filter is applied</p>
      )
    }
    if (mode === 'before') {
      return (
        <DatePicker
          label="Show content added BEFORE:"
          value={value.beforeDate}
          onChange={(date: any) => onChange({ ...value, beforeDate: date })}
        />
      )
    }
    if (mode === 'after') {
      return (
        <DatePicker
          label="Show content added AFTER:"
          value={value.afterDate}
          onChange={(date: any) => onChange({ ...value, afterDate: date })}
        />
      )
    }
    return (
      <div className="space-y-4">
        <DatePicker
          label="Show content added BETWEEN:"
          value={value.startDate}
          onChange={(date: any) => onChange({ ...value, startDate: date })}
        />
        <DatePicker
          label="AND:"
          value={value.endDate}
          onChange={(date: any) => onChange({ ...value, endDate: date })}
        />
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      <fieldset className="space-y-4">
        <legend className="text-foreground text-lg font-semibold leading-none">
          Filter by date added
        </legend>

        <div className="flex flex-col gap-2 lg:flex-row lg:gap-4">
          <div
            role="tablist"
            aria-orientation="vertical"
            className="flex flex-col gap-1 rounded-md bg-muted p-1 lg:w-48 lg:flex-shrink-0"
          >
            {MODE_OPTIONS.map((option) => {
              const isActive = value.mode === option.value
              const showInlinePanel = isActive && option.value !== 'none'

              return (
                <React.Fragment key={option.value}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-expanded={isActive}
                    onClick={() => handleModeChange(option.value)}
                    className={cn(
                      'w-full rounded-sm px-3 py-2 text-start text-base transition-colors',
                      isActive
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {option.label}
                  </button>
                  {showInlinePanel && (
                    <div className="rounded-md border bg-background px-3 py-3 lg:hidden">
                      {renderModeContent(option.value)}
                    </div>
                  )}
                </React.Fragment>
              )
            })}
          </div>

          <div className="hidden flex-1 rounded-md border px-4 py-3 text-start lg:block">
            {renderModeContent(value.mode)}
          </div>
        </div>
      </fieldset>
    </div>
  )
}
