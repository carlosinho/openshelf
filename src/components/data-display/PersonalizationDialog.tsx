import { useEffect, useRef, useState } from 'react'
import { ImageIcon, Loader2, Trash2 } from 'lucide-react'
import {
  deletePersonalizationLogo,
  fetchPersonalization,
  updatePersonalizationDisplayName,
  uploadPersonalizationLogo,
} from '../../lib/api'
import { DEFAULT_HEADER_LOGO, getLogoSrc } from '../../lib/branding'
import type { PersonalizationSettings } from '../../types/settings'
import { Button } from '../ui/button'
import { ShelfModal } from './ShelfModal'

interface PersonalizationDialogProps {
  onClose: () => void
  onUpdated: (settings: PersonalizationSettings) => void
}

export function PersonalizationDialog({ onClose, onUpdated }: PersonalizationDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [displayName, setDisplayName] = useState('')
  const [settings, setSettings] = useState<PersonalizationSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [busyAction, setBusyAction] = useState<'name' | 'logo' | 'remove' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const loadSettings = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetchPersonalization()
      setSettings(response)
      setDisplayName(response.display_name)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load personalization.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadSettings()
  }, [])

  const previewLogoSrc = settings ? getLogoSrc(settings) : DEFAULT_HEADER_LOGO

  const handleSaveName = async () => {
    setBusyAction('name')
    setError(null)
    setStatusMessage(null)

    try {
      const response = await updatePersonalizationDisplayName(displayName.trim() || null)
      setSettings(response)
      setDisplayName(response.display_name)
      onUpdated(response)
      setStatusMessage('Display name saved.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save display name.')
    } finally {
      setBusyAction(null)
    }
  }

  const handleLogoSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setBusyAction('logo')
    setError(null)
    setStatusMessage(null)

    try {
      const response = await uploadPersonalizationLogo(file)
      setSettings(response)
      onUpdated(response)
      setStatusMessage('Logo updated.')
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Failed to upload logo.')
    } finally {
      setBusyAction(null)
      event.target.value = ''
    }
  }

  const handleRemoveLogo = async () => {
    const confirmed = window.confirm('Remove the custom logo and use the default OpenShelf logo?')

    if (!confirmed) {
      return
    }

    setBusyAction('remove')
    setError(null)
    setStatusMessage(null)

    try {
      const response = await deletePersonalizationLogo()
      setSettings(response)
      onUpdated(response)
      setStatusMessage('Custom logo removed.')
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Failed to remove logo.')
    } finally {
      setBusyAction(null)
    }
  }

  return (
    <ShelfModal
      title="Personalization"
      description="Customize how this instance looks in the header, browser tab, and login screen."
      onClose={onClose}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" />
          Loading settings...
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-3">
            <label htmlFor="personalization-display-name" className="text-sm font-medium">
              Display name
            </label>
            <input
              id="personalization-display-name"
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={80}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="OpenShelf"
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to reset to OpenShelf.
            </p>
            <Button
              type="button"
              onClick={() => {
                void handleSaveName()
              }}
              disabled={busyAction !== null}
            >
              {busyAction === 'name' ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save name'
              )}
            </Button>
          </div>

          <div className="space-y-3 border-t pt-6">
            <div className="text-sm font-medium">Logo</div>
            <div className="flex items-center gap-4 rounded-lg border bg-muted/30 p-4">
              <img
                src={previewLogoSrc}
                alt={settings?.display_name ?? 'OpenShelf'}
                className="h-16 w-auto max-w-[120px] object-contain"
              />
              <div className="min-w-0 space-y-1 text-xs text-muted-foreground">
                <p>Used in the header, browser favicon, and login screen.</p>
                <p>PNG, JPEG, WebP, or GIF. Max 2MB.</p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(event) => {
                void handleLogoSelected(event)
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                disabled={busyAction !== null}
                onClick={() => fileInputRef.current?.click()}
              >
                {busyAction === 'logo' ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ImageIcon className="size-4" />
                )}
                Upload logo
              </Button>
              {settings?.has_custom_logo ? (
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  disabled={busyAction !== null}
                  onClick={() => {
                    void handleRemoveLogo()
                  }}
                >
                  {busyAction === 'remove' ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  Remove logo
                </Button>
              ) : null}
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {statusMessage ? <p className="text-sm text-muted-foreground">{statusMessage}</p> : null}
        </div>
      )}
    </ShelfModal>
  )
}
