import type { Ref } from 'react'
import { BookMarked, KeyRound, Palette, ScrollText, Settings } from 'lucide-react'
import { Button } from '../ui/button'

interface DataDisplayHeaderSettingsProps {
  settingsMenuRef: Ref<HTMLDivElement>
  isSettingsOpen: boolean
  onToggleSettingsOpen: () => void
  onOpenShelfManager: () => void
  onOpenApiKeyDialog: () => void
  onOpenAppLogsDialog: () => void
  onOpenPersonalizationDialog: () => void
}

export function DataDisplayHeaderSettings({
  settingsMenuRef,
  isSettingsOpen,
  onToggleSettingsOpen,
  onOpenShelfManager,
  onOpenApiKeyDialog,
  onOpenAppLogsDialog,
  onOpenPersonalizationDialog,
}: DataDisplayHeaderSettingsProps) {
  return (
    <div className="relative" ref={settingsMenuRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={onToggleSettingsOpen}
        className="gap-2 px-2.5"
        aria-haspopup="menu"
        aria-expanded={isSettingsOpen}
        aria-label="Settings"
      >
        <Settings className="size-4 opacity-60" aria-hidden="true" />
      </Button>
      {isSettingsOpen && (
        <div className="absolute bottom-full right-0 z-20 mb-2 w-48 rounded-lg border bg-background p-1 shadow-lg">
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenShelfManager}
            className="w-full justify-start gap-2"
          >
            <BookMarked className="size-4 opacity-60" aria-hidden="true" />
            Shelves
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenApiKeyDialog}
            className="w-full justify-start gap-2"
          >
            <KeyRound className="size-4 opacity-60" aria-hidden="true" />
            API
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenAppLogsDialog}
            className="w-full justify-start gap-2"
          >
            <ScrollText className="size-4 opacity-60" aria-hidden="true" />
            Logs
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenPersonalizationDialog}
            className="w-full justify-start gap-2"
          >
            <Palette className="size-4 opacity-60" aria-hidden="true" />
            Personalize
          </Button>
        </div>
      )}
    </div>
  )
}
