import { useEffect, useState } from 'react'
import { Copy, Eye, EyeOff, KeyRound, Loader2, RefreshCw, Trash2 } from 'lucide-react'
import {
  fetchApiKeyStatus,
  generateApiKey,
  revokeApiKey,
  type ApiKeyStatus,
} from '../../lib/api'
import { Button } from '../ui/button'
import { ShelfModal } from './ShelfModal'

interface ApiKeyDialogProps {
  onClose: () => void
}

export function ApiKeyDialog({ onClose }: ApiKeyDialogProps) {
  const [status, setStatus] = useState<ApiKeyStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [busyAction, setBusyAction] = useState<'generate' | 'revoke' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isKeyVisible, setIsKeyVisible] = useState(false)
  const [copyMessage, setCopyMessage] = useState<string | null>(null)

  const loadStatus = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const nextStatus = await fetchApiKeyStatus()
      setStatus(nextStatus)
      if (!nextStatus.configured) {
        setIsKeyVisible(false)
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load API key status.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadStatus()
  }, [])

  const handleGenerate = async () => {
    const isReplacing = status?.configured === true
    const confirmed = window.confirm(
      isReplacing
        ? 'Regenerate your API key? Tools using the current key will stop working until you update them.'
        : 'Generate an API key for remote link adding?'
    )

    if (!confirmed) {
      return
    }

    setBusyAction('generate')
    setError(null)
    setCopyMessage(null)

    try {
      const nextStatus = await generateApiKey()
      setStatus(nextStatus)
      setIsKeyVisible(true)
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : 'Failed to generate API key.')
    } finally {
      setBusyAction(null)
    }
  }

  const handleRevoke = async () => {
    const confirmed = window.confirm(
      'Revoke your API key? Remote tools will no longer be able to add links until you generate a new key.'
    )

    if (!confirmed) {
      return
    }

    setBusyAction('revoke')
    setError(null)
    setCopyMessage(null)

    try {
      await revokeApiKey()
      setStatus({ configured: false })
      setIsKeyVisible(false)
    } catch (revokeError) {
      setError(revokeError instanceof Error ? revokeError.message : 'Failed to revoke API key.')
    } finally {
      setBusyAction(null)
    }
  }

  const handleCopyKey = async () => {
    if (!status?.configured || !status.api_key) {
      return
    }

    try {
      await navigator.clipboard.writeText(status.api_key)
      setCopyMessage('API key copied.')
    } catch {
      setCopyMessage('Could not copy automatically. Select the key and copy it manually.')
    }
  }

  const handleCopyExample = async () => {
    if (!status?.configured || !status.api_key) {
      return
    }

    const origin = window.location.origin
    const example = `curl -sS -X POST '${origin}/api/v1/items' \\
  -H 'Authorization: Bearer ${status.api_key}' \\
  -H 'Content-Type: application/json' \\
  -d '{"url":"https://example.com/article"}'`

    try {
      await navigator.clipboard.writeText(example)
      setCopyMessage('Example curl command copied.')
    } catch {
      setCopyMessage('Could not copy automatically.')
    }
  }

  const maskedKey =
    status?.configured && status.api_key
      ? `${status.api_key.slice(0, 8)}${'•'.repeat(Math.max(status.api_key.length - 12, 8))}${status.api_key.slice(-4)}`
      : ''

  return (
    <ShelfModal
      title="API access"
      description="Add unread links remotely from Raycast, Alfred, curl, or other tools using an API key."
      onClose={onClose}
    >
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Loading API key status...
        </div>
      ) : (
        <div className="space-y-4">
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {copyMessage ? <p className="text-sm text-emerald-700">{copyMessage}</p> : null}

          {status?.configured ? (
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">Current API key</p>
                {status.created_at ? (
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(status.created_at * 1000).toLocaleString()}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <code className="min-w-0 flex-1 break-all rounded-md bg-muted px-3 py-2 text-xs">
                  {isKeyVisible ? status.api_key : maskedKey}
                </code>
                <div className="flex shrink-0 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsKeyVisible((prev) => !prev)}
                    className="gap-2"
                  >
                    {isKeyVisible ? (
                      <EyeOff className="size-4" aria-hidden="true" />
                    ) : (
                      <Eye className="size-4" aria-hidden="true" />
                    )}
                    {isKeyVisible ? 'Hide' : 'Show'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void handleCopyKey()
                    }}
                    className="gap-2"
                  >
                    <Copy className="size-4" aria-hidden="true" />
                    Copy key
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Send links with <code className="rounded bg-muted px-1">POST /api/v1/items</code> and{' '}
                <code className="rounded bg-muted px-1">Authorization: Bearer &lt;key&gt;</code>. New
                links are added as unread and use the same title fetching as manual adds in the app.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  void handleCopyExample()
                }}
                className="gap-2"
              >
                <Copy className="size-4 opacity-60" aria-hidden="true" />
                Copy curl example
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No API key is configured yet. Generate one to enable remote link adding.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => {
                void handleGenerate()
              }}
              disabled={busyAction !== null}
              className="gap-2"
            >
              {busyAction === 'generate' ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : status?.configured ? (
                <RefreshCw className="size-4" aria-hidden="true" />
              ) : (
                <KeyRound className="size-4" aria-hidden="true" />
              )}
              {status?.configured ? 'Regenerate key' : 'Generate key'}
            </Button>
            {status?.configured ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void handleRevoke()
                }}
                disabled={busyAction !== null}
                className="gap-2 text-red-600 hover:text-red-700"
              >
                {busyAction === 'revoke' ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="size-4" aria-hidden="true" />
                )}
                Revoke key
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </ShelfModal>
  )
}
