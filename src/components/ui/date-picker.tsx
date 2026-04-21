"use client"

import { CalendarIcon } from "lucide-react"
import {
  Button,
  DatePicker as AriaDatePicker,
  DateRangePicker,
  Dialog,
  Group,
  Label,
  Popover,
  I18nProvider,
} from "react-aria-components"

import { Calendar, RangeCalendar } from "./calendar-rac"
import { DateInput } from "./datefield-rac"
import { cn } from "../../lib/utils"

// Single Date Picker Component using the user's exact template
interface DatePickerProps {
  label?: string
  className?: string
  value?: any
  onChange?: (value: any) => void
  [key: string]: any
}

export function DatePicker({ label = "Date picker", className, value, onChange, ...props }: DatePickerProps) {
  return (
    <I18nProvider locale="en-GB">
      <AriaDatePicker className={cn("space-y-2", className)} value={value} onChange={onChange} {...props}>
      <Label className="text-foreground text-sm font-medium">{label}</Label>
      <div className="flex">
        <Group className="w-60">
          <DateInput className="pe-9" />
        </Group>
        <Button className="text-muted-foreground/80 hover:text-foreground data-focus-visible:border-ring data-focus-visible:ring-ring/50 z-10 -ms-9 -me-px flex w-9 items-center justify-center rounded-e-md transition-[color,box-shadow] outline-none data-focus-visible:ring-[3px]">
          <CalendarIcon size={16} />
        </Button>
      </div>
      <Popover
        className="bg-background text-popover-foreground data-entering:animate-in data-exiting:animate-out data-[entering]:fade-in-0 data-[exiting]:fade-out-0 data-[entering]:zoom-in-95 data-[exiting]:zoom-out-95 data-[placement=bottom]:slide-in-from-top-2 data-[placement=left]:slide-in-from-right-2 data-[placement=right]:slide-in-from-left-2 data-[placement=top]:slide-in-from-bottom-2 z-50 rounded-lg border shadow-lg outline-hidden"
        offset={4}
      >
        <Dialog className="max-h-[inherit] overflow-auto p-2">
          <Calendar />
                </Dialog>
      </Popover>
 
      </AriaDatePicker>
    </I18nProvider>
  )
}

// Date Range Picker Component  
interface DateRangePickerComponentProps {
  label?: string
  className?: string
  value?: any
  onChange?: (value: any) => void
  [key: string]: any
}

export function DateRangePickerComponent({ label = "Date range picker", className, value, onChange, ...props }: DateRangePickerComponentProps) {
  return (
    <I18nProvider locale="en-GB">
      <DateRangePicker className={cn("space-y-2", className)} value={value} onChange={onChange} {...props}>
      <Label className="text-foreground text-sm font-medium">{label}</Label>
      <div className="flex">
        <Group className="w-80">
          <DateInput slot="start" className="pe-9" />
          <span aria-hidden="true" className="text-muted-foreground/70 px-2">
            -
          </span>
          <DateInput slot="end" className="pe-9" />
        </Group>
        <Button className="text-muted-foreground/80 hover:text-foreground data-focus-visible:border-ring data-focus-visible:ring-ring/50 z-10 -ms-9 -me-px flex w-9 items-center justify-center rounded-e-md transition-[color,box-shadow] outline-none data-focus-visible:ring-[3px]">
          <CalendarIcon size={16} />
        </Button>
      </div>
      <Popover
        className="bg-background text-popover-foreground data-entering:animate-in data-exiting:animate-out data-[entering]:fade-in-0 data-[exiting]:fade-out-0 data-[entering]:zoom-in-95 data-[exiting]:zoom-out-95 data-[placement=bottom]:slide-in-from-top-2 data-[placement=left]:slide-in-from-right-2 data-[placement=right]:slide-in-from-left-2 data-[placement=top]:slide-in-from-bottom-2 z-50 rounded-lg border shadow-lg outline-hidden"
        offset={4}
      >
        <Dialog className="max-h-[inherit] overflow-auto p-2">
          <RangeCalendar />
                </Dialog>
      </Popover>
 
      </DateRangePicker>
    </I18nProvider>
  )
} 