"use client"

import React from "react"
import { cn } from "../../lib/utils"
import { DatePicker } from "./date-picker"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs"

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

export function DateRangeFilter({ value, onChange, className }: DateRangeFilterProps) {
  const handleTabChange = (mode: DateFilterMode) => {
    onChange({
      mode,
      beforeDate: mode === 'before' ? value.beforeDate : undefined,
      afterDate: mode === 'after' ? value.afterDate : undefined,
      startDate: mode === 'between' ? value.startDate : undefined,
      endDate: mode === 'between' ? value.endDate : undefined,
      dateRange: mode === 'between' ? value.dateRange : undefined,
    })
  }

  return (
    <div className={cn("space-y-4", className)}>
      <fieldset className="space-y-4">
        <legend className="text-foreground text-lg font-semibold leading-none">
          Filter by date added
        </legend>
        
        <Tabs
          defaultValue={value.mode}
          orientation="vertical"
          className="w-full flex flex-row gap-4"
          value={value.mode}
          onValueChange={(value: string) => handleTabChange(value as DateFilterMode)}
        >
          <TabsList className="flex flex-col h-auto bg-muted p-1 rounded-md space-y-1">
            <TabsTrigger value="none" className="w-full justify-start text-base">
              No date filter
            </TabsTrigger>
            <TabsTrigger value="before" className="w-full justify-start text-base">
              Added before
            </TabsTrigger>
            <TabsTrigger value="after" className="w-full justify-start text-base">
              Added after
            </TabsTrigger>
            <TabsTrigger value="between" className="w-full justify-start text-base">
              Added between
            </TabsTrigger>
          </TabsList>
          <div className="flex-1 rounded-md border text-start">
            <TabsContent value="none" className="mt-0">
              <div className="px-4 py-3">
                <p className="text-muted-foreground text-sm">
                  No date filter is applied
                </p>
              </div>
            </TabsContent>
            <TabsContent value="before" className="mt-0">
              <div className="px-4 py-3 space-y-3">
                <DatePicker
                  label="Show content added BEFORE:"
                  value={value.beforeDate}
                  onChange={(date: any) => onChange({ ...value, beforeDate: date })}
                />
              </div>
            </TabsContent>
            <TabsContent value="after" className="mt-0">
              <div className="px-4 py-3 space-y-3">
                <DatePicker
                  label="Show content added AFTER:"
                  value={value.afterDate}
                  onChange={(date: any) => onChange({ ...value, afterDate: date })}
                />
              </div>
            </TabsContent>
            <TabsContent value="between" className="mt-0">
              <div className="px-4 py-3 space-y-4">
                <div className="space-y-3">
                  <DatePicker
                    label="Show content added BETWEEN:"
                    value={value.startDate}
                    onChange={(date: any) => onChange({ ...value, startDate: date })}
                  />
                </div>
                <div className="space-y-3">
                  <DatePicker
                    label="AND:"
                    value={value.endDate}
                    onChange={(date: any) => onChange({ ...value, endDate: date })}
                  />
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </fieldset>
    </div>
  )
} 