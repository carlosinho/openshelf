import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from '../ui/button'

interface ShelfModalProps {
  title: string
  description?: string
  children: ReactNode
  onClose: () => void
}

export function ShelfModal({ title, description, children, onClose }: ShelfModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-xl border bg-background shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b p-4">
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
