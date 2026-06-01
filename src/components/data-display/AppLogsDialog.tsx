import { useEffect, useState } from 'react'
import { Loader2, ScrollText, Trash2 } from 'lucide-react'
import { deleteAllAppLogs, fetchAppLogs, pruneAppLogs, setAppLoggingEnabled } from '../../lib/api'
import type { AppLogEntry } from '../../types/app-log'
import { formatDateTime } from '../../lib/utils'
import { Button } from '../ui/button'
import { Switch } from '../ui/switch'
import { ShelfModal } from './ShelfModal'

interface AppLogsDialogProps {
  onClose: () => void
}

export function AppLogsDialog({ onClose }: AppLogsDialogProps) {
  const [logs, setLogs] = useState<AppLogEntry[]>([])
  const [loggingEnabled, setLoggingEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [busyAction, setBusyAction] = useState<'wipe' | 'prune' | 'toggle' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const loadLogs = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetchAppLogs()
      setLogs(response.logs)
      setLoggingEnabled(response.logging_enabled)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load app logs.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadLogs()
  }, [])

  const handleToggleLogging = async (enabled: boolean) => {
    const previous = loggingEnabled
    setLoggingEnabled(enabled)
    setBusyAction('toggle')
    setError(null)
    setStatusMessage(null)

    try {
      const response = await setAppLoggingEnabled(enabled)
      setLoggingEnabled(response.logging_enabled)
      setStatusMessage(
        response.logging_enabled
          ? 'Activity logging is on. New actions will be recorded.'
          : 'Activity logging is off. New actions will not be recorded.'
      )
    } catch (toggleError) {
      setLoggingEnabled(previous)
      setError(toggleError instanceof Error ? toggleError.message : 'Failed to update logging setting.')
    } finally {
      setBusyAction(null)
    }
  }

  const handleWipe = async () => {
    const confirmed = window.confirm(
      'Delete all app logs? This cannot be undone.'
    )

    if (!confirmed) {
      return
    }

    setBusyAction('wipe')
    setError(null)
    setStatusMessage(null)

    try {
      const result = await deleteAllAppLogs()
      setLogs([])
      setStatusMessage(`Deleted ${result.deleted} log entr${result.deleted === 1 ? 'y' : 'ies'}.`)
    } catch (wipeError) {
      setError(wipeError instanceof Error ? wipeError.message : 'Failed to delete app logs.')
    } finally {
      setBusyAction(null)
    }
  }

  const handlePrune = async () => {
    const confirmed = window.confirm(
      'Delete log entries older than 6 months?'
    )

    if (!confirmed) {
      return
    }

    setBusyAction('prune')
    setError(null)
    setStatusMessage(null)

    try {
      const result = await pruneAppLogs()
      setStatusMessage(`Deleted ${result.deleted} log entr${result.deleted === 1 ? 'y' : 'ies'} older than 6 months.`)
      await loadLogs()
    } catch (pruneError) {
      setError(pruneError instanceof Error ? pruneError.message : 'Failed to prune old app logs.')
    } finally {
      setBusyAction(null)
    }
  }

  const isBusy = busyAction !== null

  return (
    <ShelfModal
      title="Logs"
      description="Significant library actions such as adding links, archiving, imports, shelf assignments, and API activity."
      onClose={onClose}
    >
      <div className="max-h-[min(70vh,36rem)] space-y-4 overflow-y-auto pr-1">
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-3">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Activity logging</p>
          </div>
          <Switch
            checked={loggingEnabled}
            onCheckedChange={(checked) => {
              void handleToggleLogging(checked)
            }}
            disabled={isBusy || isLoading}
            aria-label="Enable activity logging"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void handlePrune()
            }}
            disabled={isBusy || isLoading}
            className="gap-2"
          >
            {busyAction === 'prune' ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="size-4 opacity-60" aria-hidden="true" />
            )}
            Delete older than 6 months
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void handleWipe()
            }}
            disabled={isBusy || isLoading}
            className="gap-2 text-red-600 hover:text-red-700"
          >
            {busyAction === 'wipe' ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="size-4 opacity-60" aria-hidden="true" />
            )}
            Wipe all logs
          </Button>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {statusMessage ? <p className="text-sm text-emerald-700">{statusMessage}</p> : null}

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Loading app logs...
          </div>
        ) : logs.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            <ScrollText className="size-4 shrink-0 opacity-60" aria-hidden="true" />
            {loggingEnabled
              ? 'No activity logged yet.'
              : 'Logging is off. Turn on activity logging to record new actions.'}
          </div>
        ) : (
          <ul className="space-y-2">
            {!loggingEnabled ? (
              <li className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
                Logging is off. Entries below are from when logging was enabled.
              </li>
            ) : null}
            {logs.map((entry) => (
              <li
                key={entry.id}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={
                      entry.outcome === 'failure'
                        ? 'font-medium text-red-700'
                        : 'font-medium text-foreground'
                    }
                  >
                    {entry.summary}
                  </span>
                  <time
                    dateTime={new Date(entry.created_at * 1000).toISOString()}
                    className="shrink-0 text-xs text-muted-foreground"
                  >
                    {formatDateTime(entry.created_at)}
                  </time>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ShelfModal>
  )
}
