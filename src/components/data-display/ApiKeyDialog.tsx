import { useEffect, useState } from 'react'
import { Copy, Eye, EyeOff, KeyRound, Loader2, RefreshCw, Smartphone, Trash2 } from 'lucide-react'
import {
  fetchApiKeyStatus,
  generateApiKey,
  revokeApiKey,
  type ApiKeyStatus,
} from '../../lib/api'
import { Button } from '../ui/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion'
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

  const copyText = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopyMessage(successMessage)
    } catch {
      setCopyMessage('Could not copy automatically.')
    }
  }

  const handleCopyIosValues = async () => {
    if (!status?.configured || !status.api_key) {
      return
    }

    const origin = window.location.origin
    const values = [
      `OpenShelf URL: ${origin}`,
      `POST URL: ${origin}/api/v1/items`,
      `Authorization: Bearer ${status.api_key}`,
      `Request body (replace URL with the shared link): {"url":"https://example.com/article"}`,
    ].join('\n')

    await copyText(values, 'iOS Shortcut values copied.')
  }

  const maskedKey =
    status?.configured && status.api_key
      ? `${status.api_key.slice(0, 8)}${'•'.repeat(Math.max(status.api_key.length - 12, 8))}${status.api_key.slice(-4)}`
      : ''

  return (
    <ShelfModal
      title="API"
      description="Add unread links remotely from Raycast, Alfred, curl, the iOS Share menu, or other tools using an API key."
      onClose={onClose}
    >
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Loading API key status...
        </div>
      ) : (
        <div className="max-h-[min(70vh,36rem)] space-y-4 overflow-y-auto pr-1">
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

          {status?.configured && status.api_key ? (
            <Accordion type="single" collapsible className="rounded-lg border">
              <AccordionItem value="ios-sharing" className="border-0">
                <AccordionTrigger className="px-3 py-3 hover:bg-muted/50">
                  <Smartphone className="size-4 shrink-0 opacity-70" aria-hidden="true" />
                  Save from iPhone or iPad
                </AccordionTrigger>
                <AccordionContent className="space-y-3 px-3 pb-3">
                  <p className="text-xs text-muted-foreground">
                    Set this up in Safari on your phone so the URL below matches your OpenShelf instance (
                    <code className="rounded bg-muted px-1">{window.location.origin}</code>).
                  </p>
                  <ol className="list-decimal space-y-2.5 pl-4 text-xs text-muted-foreground">
                    <li>
                      Open the <strong className="font-medium text-foreground">Shortcuts</strong> app and create a new
                      shortcut named something like &quot;Add to OpenShelf&quot;.
                    </li>
                    <li>
                      Tap the <strong className="font-medium text-foreground">(i)</strong> icon at the bottom of the
                      shortcut editor and turn on{' '}
                      <strong className="font-medium text-foreground">Show in Share Sheet</strong>.
                    </li>
                    <li>
                      Under share-sheet input, choose <strong className="font-medium text-foreground">URL</strong> as
                      the accepted type.
                    </li>
                    <li>
                      Add the action <strong className="font-medium text-foreground">Get URLs from Input</strong>.
                    </li>
                    <li>
                      Add <strong className="font-medium text-foreground">Get Item from List</strong> →{' '}
                      <strong className="font-medium text-foreground">First Item</strong> from{' '}
                      <strong className="font-medium text-foreground">URLs</strong> so only one shared link is used.
                    </li>
                    <li>
                      Add <strong className="font-medium text-foreground">Get Contents of URL</strong> and configure:
                      <ul className="mt-1.5 list-disc space-y-1 pl-4">
                        <li>
                          <strong className="font-medium text-foreground">URL:</strong>{' '}
                          <code className="break-all rounded bg-muted px-1">
                            {window.location.origin}/api/v1/items
                          </code>
                        </li>
                        <li>
                          <strong className="font-medium text-foreground">Method:</strong> POST
                        </li>
                        <li>
                          <strong className="font-medium text-foreground">Headers:</strong>{' '}
                          <code className="rounded bg-muted px-1">Authorization</code> ={' '}
                          <code className="break-all rounded bg-muted px-1">
                            Bearer {isKeyVisible ? status.api_key : 'your_API_key'}
                          </code>
                        </li>
                        <li>
                          <strong className="font-medium text-foreground">Request body:</strong> JSON with field{' '}
                          <code className="rounded bg-muted px-1">url</code> set to the{' '}
                          <strong className="font-medium text-foreground">First Item</strong> variable from the list
                          step.
                        </li>
                      </ul>
                    </li>
                    <li>
                      Optional: add <strong className="font-medium text-foreground">Show Notification</strong> if you
                      want confirmation after the link is sent.
                    </li>
                  </ol>
                  <p className="text-xs text-muted-foreground">
                    Share a page from Safari (or another app), pick your shortcut, and confirm the link appears as
                    unread in OpenShelf. Use HTTPS on the public internet. If you regenerate or revoke the API key,
                    update the shortcut&apos;s Authorization header.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void handleCopyIosValues()
                    }}
                    className="gap-2"
                  >
                    <Copy className="size-4 opacity-60" aria-hidden="true" />
                    Copy Shortcut values
                  </Button>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          ) : null}
        </div>
      )}
    </ShelfModal>
  )
}
