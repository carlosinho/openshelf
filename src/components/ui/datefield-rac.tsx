"use client"

import React from "react"
import {
  DateInput as AriaDateInput,
  DateSegment,
} from "react-aria-components"
import { cn } from "../../lib/utils"

export const dateInputStyle = cn(
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
)

interface DateInputProps {
  className?: string
  slot?: string
  unstyled?: boolean
  [key: string]: any
}

export function DateInput({ className, ...props }: DateInputProps) {
  return (
    <AriaDateInput
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {(segment: any) => (
        <DateSegment
          segment={segment}
          className={cn(
            "rounded px-0.5 py-0.5 focus:bg-accent focus:text-accent-foreground focus:outline-none",
            segment.isPlaceholder && "text-muted-foreground/70"
          )}
        />
      )}
    </AriaDateInput>
  )
} 