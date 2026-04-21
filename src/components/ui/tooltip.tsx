import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "../../lib/utils"

interface TooltipProps {
  children: React.ReactNode
  content: string
  className?: string
}

export function Tooltip({ children, content, className }: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false)
  const [position, setPosition] = React.useState({ x: 0, y: 0 })
  const triggerRef = React.useRef<HTMLDivElement>(null)

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 8
    })
    setIsVisible(true)
  }

  const handleMouseLeave = () => {
    setIsVisible(false)
  }

  return (
    <>
      <div 
        ref={triggerRef}
        className="relative inline-block cursor-help"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
      {isVisible && createPortal(
        <div
          className={cn(
            "fixed z-[99999] -translate-x-1/2 -translate-y-full rounded-md bg-gray-900 px-3 py-2 text-xs text-white shadow-lg border border-gray-700 pointer-events-none",
            className
          )}
          style={{
            left: position.x,
            top: position.y,
          }}
        >
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>,
        document.body
      )}
    </>
  )
} 