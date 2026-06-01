import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from '../ui/button'

interface ShelfModalProps {
  title: string
  description?: string
  children: ReactNode
  onClose: () => void
  panelClassName?: string
  headerClassName?: string
}

export function ShelfModal({
  title,
  description,
  children,
  onClose,
  panelClassName = 'border bg-background shadow-xl',
  headerClassName = 'border-b',
}: ShelfModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className={`w-full max-w-xl rounded-xl ${panelClassName}`}>
        <div className={`flex items-start justify-between gap-3 p-4 ${headerClassName}`}>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">{title}</h2>
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="shrink-0"
            aria-label="Close"
          >
            <X className="size-4" />
          </Button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
