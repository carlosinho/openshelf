"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "../../lib/utils"

const Accordion = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    type?: "single" | "multiple"
    collapsible?: boolean
    defaultValue?: string
    value?: string
    onValueChange?: (value: string) => void
  }
>(({ className, type = "single", collapsible = false, defaultValue, value, onValueChange, children, ...props }, ref) => {
  const [openItems, setOpenItems] = React.useState<string[]>(
    defaultValue ? [defaultValue] : []
  )

  const handleValueChange = React.useCallback((itemValue: string) => {
    if (type === "single") {
      const newValue = openItems.includes(itemValue) && collapsible ? "" : itemValue
      setOpenItems(newValue ? [newValue] : [])
      onValueChange?.(newValue)
    } else {
      const newOpenItems = openItems.includes(itemValue)
        ? openItems.filter(item => item !== itemValue)
        : [...openItems, itemValue]
      setOpenItems(newOpenItems)
    }
  }, [openItems, type, collapsible, onValueChange])

  return (
    <div
      ref={ref}
      className={cn("space-y-2", className)}
      {...props}
    >
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child, {
              isOpen: openItems.includes(child.props.value),
              onToggle: () => handleValueChange(child.props.value),
            } as any)
          : child
      )}
    </div>
  )
})
Accordion.displayName = "Accordion"

const AccordionItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value: string
    isOpen?: boolean
    onToggle?: () => void
  }
>(({ className, value, isOpen, onToggle, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("border border-border rounded-lg", className)}
      {...props}
    >
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child, { isOpen, onToggle } as any)
          : child
      )}
    </div>
  )
})
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    isOpen?: boolean
    onToggle?: () => void
  }
>(({ className, children, isOpen, onToggle, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        "flex w-full items-center justify-between p-4 text-left transition-all hover:bg-muted/50 [&[data-state=open]>svg]:rotate-180",
        className
      )}
      data-state={isOpen ? "open" : "closed"}
      onClick={onToggle}
      {...props}
    >
      <span className="flex items-center gap-3 text-sm font-medium">
        {children}
      </span>
      <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
    </button>
  )
})
AccordionTrigger.displayName = "AccordionTrigger"

const AccordionContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    isOpen?: boolean
  }
>(({ className, children, isOpen, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "overflow-hidden transition-all duration-200",
        isOpen ? "animate-accordion-down" : "animate-accordion-up"
      )}
      style={{
        height: isOpen ? "auto" : 0,
      }}
      {...props}
    >
      <div className={cn("p-4 pt-0", className)}>{children}</div>
    </div>
  )
})
AccordionContent.displayName = "AccordionContent"

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent } 