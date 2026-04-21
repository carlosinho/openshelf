"use client"

import React from "react"
import {
  Calendar as AriaCalendar,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHeader,
  CalendarHeaderCell,
  CalendarCell,
  Button,
  Heading,
} from "react-aria-components"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "../../lib/utils"

export function Calendar({ className, ...props }: React.ComponentProps<typeof AriaCalendar>) {
  return (
    <AriaCalendar
      className={cn("p-3", className)}
      {...props}
    >
      <header className="flex w-full items-center justify-between pb-4">
        <Button 
          slot="previous" 
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-7 w-7 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Heading className="text-sm font-medium" />
        <Button 
          slot="next" 
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-7 w-7 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </header>
      <CalendarGrid className="w-full border-collapse select-none space-y-1">
        <CalendarGridHeader>
          {(day: any) => (
            <CalendarHeaderCell className="text-muted-foreground w-9 rounded-md text-[0.8rem] font-normal">
              {day}
            </CalendarHeaderCell>
          )}
        </CalendarGridHeader>
        <CalendarGridBody>
          {(date: any) => (
            <CalendarCell
              date={date}
              className="relative p-0 text-center text-sm focus-within:relative focus-within:z-20"
            >
              {({ formattedDate, isSelected, isInvalid, isOutsideMonth }: any) => (
                <div className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-md p-0 text-sm font-normal ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isSelected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                  isInvalid && "text-muted-foreground opacity-50",
                  isOutsideMonth && "text-muted-foreground opacity-50"
                )}>
                  {formattedDate}
                </div>
              )}
            </CalendarCell>
          )}
        </CalendarGridBody>
      </CalendarGrid>
    </AriaCalendar>
  )
}

// Keep RangeCalendar for the date range picker
export function RangeCalendar({ className, ...props }: any) {
  return (
    <AriaCalendar
      className={cn("p-3", className)}
      {...props}
    >
      <header className="flex w-full items-center justify-between pb-4">
        <Button 
          slot="previous" 
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-7 w-7 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Heading className="text-sm font-medium" />
        <Button 
          slot="next" 
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-7 w-7 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </header>
      <CalendarGrid className="w-full border-collapse select-none space-y-1">
        <CalendarGridHeader>
          {(day: any) => (
            <CalendarHeaderCell className="text-muted-foreground w-9 rounded-md text-[0.8rem] font-normal">
              {day}
            </CalendarHeaderCell>
          )}
        </CalendarGridHeader>
        <CalendarGridBody>
          {(date: any) => (
            <CalendarCell
              date={date}
              className="relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&[data-selected]]:bg-primary [&[data-selected]]:text-primary-foreground [&[data-selection-start]]:rounded-s-md [&[data-selection-end]]:rounded-e-md [&[data-hovered]]:bg-accent [&[data-hovered]]:text-accent-foreground"
            >
              {({ formattedDate, isSelected, isInvalid, isOutsideMonth }: any) => (
                <div className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-md p-0 text-sm font-normal ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isSelected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                  isInvalid && "text-muted-foreground opacity-50",
                  isOutsideMonth && "text-muted-foreground opacity-50"
                )}>
                  {formattedDate}
                </div>
              )}
            </CalendarCell>
          )}
        </CalendarGridBody>
      </CalendarGrid>
    </AriaCalendar>
  )
} 